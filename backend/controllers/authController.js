const Admin = require('../models/Admin');
const Cafe = require('../models/Cafe');
const Subscription = require('../models/Subscription');
const Settings = require('../models/Settings');
const SubscriptionRequest = require('../models/SubscriptionRequest');
const { generateToken } = require('../utils/jwt');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const { resetPasswordTemplate, deviceLogoutOtpTemplate } = require('../utils/emailTemplates');
const logger = require('../utils/logger');

// Helper to determine clean Frontend URL for emails
const getCleanFrontendUrl = (req) => {
  if (process.env.FRONTEND_URL && process.env.FRONTEND_URL !== '*' && !process.env.FRONTEND_URL.includes('*')) {
    return process.env.FRONTEND_URL.replace(/\/$/, '');
  }
  const host = req.get('host') || 'localhost:5000';
  const protocol = req.protocol || 'http';
  // Common dev mapping: 5000 -> 5173 (Vite frontend)
  const feHost = host.includes('5000') ? host.replace('5000', '5173') : host;
  return `${protocol}://${feHost}`;
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
const forgotPassword = async (req, res, next) => {
  try {
    const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!rawEmail) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }

    const cafe = await Cafe.findOne({ email: rawEmail });

    // Prevent account enumeration by returning identical success response whether email exists or not
    if (!cafe) {
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, password reset instructions have been sent.'
      });
    }

    // Get reset token
    const resetToken = cafe.getResetPasswordToken();
    await cafe.save({ validateBeforeSave: false });

    // Create reset url
    const baseUrl = getCleanFrontendUrl(req);
    const resetUrl = `${baseUrl}/set-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) requested a password reset. Please reset your password here: \n\n ${resetUrl}`;
    const html = resetPasswordTemplate(resetUrl);

    try {
      await sendEmail({
        email: cafe.email,
        subject: 'Password reset instructions',
        message,
        html
      });

      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, password reset instructions have been sent.'
      });
    } catch (error) {
      console.error('Password reset email failed:', error.message);
      cafe.resetPasswordToken = undefined;
      cafe.resetPasswordExpire = undefined;
      await cafe.save({ validateBeforeSave: false });

      return res.status(500).json({ success: false, message: 'Email could not be sent. Please try again later.' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Set password via email token
// @route   POST /api/auth/set-password/:token
const setPassword = async (req, res, next) => {
  try {
    const rawToken = typeof req.params?.token === 'string' ? req.params.token.trim() : '';
    const newPassword = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!rawToken || !newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Valid token and password of at least 6 characters are required'
      });
    }

    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    // Find user by token and check expiry (select fields explicitly since they have select: false)
    const cafe = await Cafe.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    }).select('+password +resetPasswordToken +resetPasswordExpire');

    if (!cafe) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token'
      });
    }

    const token = generateToken(cafe._id, 'owner');

    // Set new password and revoke all existing sessions to block compromised devices
    cafe.password = newPassword;
    cafe.resetPasswordToken = undefined;
    cafe.resetPasswordExpire = undefined;
    cafe.active_sessions = [{
      token,
      device_info: 'Password Reset',
      last_active: Date.now()
    }];
    await cafe.save();

    res.json({
      success: true,
      message: 'Password reset successfully',
      data: {
        token,
        user: {
          id: cafe._id,
          name: cafe.name,
          email: cafe.email,
          role: 'owner'
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login (Admin or Cafe Owner)
// @route   POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const { forceLogout, logoutSessionIds } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check admin first
    let user = await Admin.findOne({ email }).select('+password');
    let role = 'superadmin';

    // If not admin, check cafe owner (select OTP fields explicitly)
    if (!user) {
      user = await Cafe.findOne({ email }).select('+password +login_otp +login_otp_expire +login_otp_attempts +login_otp_last_sent');
      role = 'owner';
    }

    if (!user) {
      logger.security('SECURITY_FAILED_LOGIN', { ip: req.ip, email, reason: 'Account not found', request_id: req.id });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check account status and maintenance mode for owners
    if (role === 'owner') {
      if (user.is_active === false) {
        logger.security('SECURITY_SUSPENDED_LOGIN_ATTEMPT', { ip: req.ip, email, user_id: user._id, reason: 'Account deactivated', request_id: req.id });
        return res.status(403).json({
          success: false,
          message: 'Account has been deactivated. Please contact platform administration.'
        });
      }

      const settings = await Settings.getSettings();
      if (settings.maintenance_mode) {
        return res.status(503).json({
          success: false,
          message: 'The platform is currently under maintenance. Please try again later.'
        });
      }
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      logger.security('SECURITY_FAILED_LOGIN', { ip: req.ip, email, user_id: user._id, reason: 'Invalid password', request_id: req.id });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (role === 'owner') {
      const plan = user.subscription?.plan_name || 'starter';
      let limit = 1;
      if (plan === 'pro') limit = 2;
      if (plan === 'pro_plus' || plan === 'pro-plus' || plan === 'pro plus') limit = 3;

      if (!user.active_sessions) user.active_sessions = [];
      
      // Clean up expired sessions (older than 7 days)
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
      user.active_sessions = user.active_sessions.filter(s => (Date.now() - new Date(s.last_active || Date.now()).getTime()) < SEVEN_DAYS);

      if (forceLogout) {
        // Enforce 60-second resend cooldown to protect against email flooding / OTP spam
        if (user.login_otp_last_sent && (Date.now() - new Date(user.login_otp_last_sent).getTime() < 60 * 1000)) {
          const waitSecs = Math.ceil((60 * 1000 - (Date.now() - new Date(user.login_otp_last_sent).getTime())) / 1000);
          return res.status(429).json({
            success: false,
            message: `Please wait ${waitSecs} seconds before requesting a new verification code.`
          });
        }

        // Generate cryptographically secure 6-digit OTP
        const otp = crypto.randomInt(100000, 1000000).toString();
        const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
        
        // Save hashed OTP to user document
        user.login_otp = hashedOtp;
        user.login_otp_expire = Date.now() + 10 * 60 * 1000; // 10 minutes
        user.login_otp_attempts = 0; // Reset failed attempt counter
        user.login_otp_last_sent = new Date();
        user.pending_logout_sessions = Array.isArray(logoutSessionIds) ? logoutSessionIds : [];
        await user.save({ validateBeforeSave: false });

        console.log(`🔐 [DEVICE LOGOUT OTP] Generated code for ${user.email}`);

        // Send Email
        try {
          const message = `You requested to force logout devices. Your OTP code is: ${otp}\n\nThis code is valid for 10 minutes.`;
          const htmlMessage = deviceLogoutOtpTemplate(otp, user.name, (logoutSessionIds || []).length || 1);

          await sendEmail({
            email: user.email,
            subject: 'Your Device Logout Verification Code (OTP)',
            message: message,
            html: htmlMessage
          });

          return res.json({
            success: true,
            requireOtp: true,
            email: user.email,
            message: 'Verification OTP sent to your registered email'
          });
        } catch (err) {
          console.error('❌ Failed to send force logout OTP email:', err);
          user.login_otp = undefined;
          user.login_otp_expire = undefined;
          user.login_otp_attempts = 0;
          user.pending_logout_sessions = undefined;
          await user.save({ validateBeforeSave: false });
          
          return res.status(500).json({
            success: false,
            message: `Email could not be sent: ${err.message || 'SMTP connection failed'}. Please verify email settings or try again.`
          });
        }
      } else if (user.active_sessions.length >= limit) {
        // Normal login, but limit is reached
        const safeSessions = user.active_sessions.map(s => ({
          _id: s._id ? s._id.toString() : '',
          device_info: s.device_info || 'Unknown Device',
          last_active: s.last_active || Date.now()
        }));
        
        return res.status(403).json({
          success: false,
          errorType: 'DEVICE_LIMIT_REACHED',
          limit,
          sessions: safeSessions,
          message: `Device limit reached (${user.active_sessions.length}/${limit}). Please select device(s) to log out.`
        });
      }

      // Normal login, limit NOT reached
      const token = generateToken(user._id, role);
      
      const ua = req.headers['user-agent'] || 'Unknown Device';
      let device_info = 'Unknown Device';
      if (ua !== 'Unknown Device') {
        const browserMatch = /(chrome|safari|firefox|edge|opera)/i.exec(ua);
        const browser = browserMatch ? browserMatch[0] : 'Browser';
        const osMatch = /(windows|macintosh|android|iphone|ipad|linux)/i.exec(ua);
        const os = osMatch ? osMatch[0] : 'OS';
        device_info = `${browser.charAt(0).toUpperCase() + browser.slice(1)} on ${os === 'macintosh' ? 'Mac' : os.charAt(0).toUpperCase() + os.slice(1)}`;
      }

      user.active_sessions.push({ token, device_info, last_active: Date.now() });
      user.markModified('active_sessions');
      await user.save({ validateBeforeSave: false });

      return res.json({
        success: true,
        data: {
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role
          }
        }
      });
    }

    // For admin, login successfully directly
    const token = generateToken(user._id, role);
    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Login OTP
// @route   POST /api/auth/verify-login-otp
const verifyLoginOtp = async (req, res, next) => {
  try {
    const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const rawOtp = req.body?.otp ? req.body.otp.toString().trim() : '';
    const { logoutSessionIds } = req.body;

    if (!rawEmail || !rawOtp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and OTP'
      });
    }

    const user = await Cafe.findOne({ email: rawEmail }).select('+login_otp +login_otp_expire +login_otp_attempts +login_otp_last_sent +pending_logout_sessions');
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request. User not found.'
      });
    }

    if (user.is_active === false) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated. Please contact platform administration.'
      });
    }

    // Check if OTP exists and is within 10-minute expiry window
    if (!user.login_otp || !user.login_otp_expire || user.login_otp_expire < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired or is invalid. Please request a new verification code.'
      });
    }

    // Enforce max 5 failed attempts limit
    if ((user.login_otp_attempts || 0) >= 5) {
      user.login_otp = undefined;
      user.login_otp_expire = undefined;
      user.login_otp_attempts = 0;
      user.login_otp_last_sent = undefined;
      user.pending_logout_sessions = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(429).json({
        success: false,
        message: 'Too many failed verification attempts. This OTP has been invalidated for security. Please request a new code.'
      });
    }

    // Validate OTP match (support SHA-256 hashed and legacy raw string)
    const hashedOtp = crypto.createHash('sha256').update(rawOtp).digest('hex');
    const isOtpMatch = (user.login_otp === hashedOtp) || (user.login_otp === rawOtp);

    if (!isOtpMatch) {
      user.login_otp_attempts = (user.login_otp_attempts || 0) + 1;
      const remaining = 5 - user.login_otp_attempts;
      logger.security('SECURITY_FAILED_OTP', {
        ip: req.ip,
        email: user.email,
        user_id: user._id,
        attempts: user.login_otp_attempts,
        request_id: req.id
      });

      if (user.login_otp_attempts >= 5) {
        user.login_otp = undefined;
        user.login_otp_expire = undefined;
        user.login_otp_attempts = 0;
        user.login_otp_last_sent = undefined;
        user.pending_logout_sessions = undefined;
        await user.save({ validateBeforeSave: false });

        return res.status(429).json({
          success: false,
          message: 'Too many failed attempts. This OTP has been invalidated for security. Please request a new code.'
        });
      }

      await user.save({ validateBeforeSave: false });

      return res.status(400).json({
        success: false,
        message: `Invalid OTP code. You have ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
      });
    }

    const plan = user.subscription?.plan_name || 'starter';
    let limit = 1;
    if (plan === 'pro') limit = 2;
    if (plan === 'pro_plus' || plan === 'pro-plus' || plan === 'pro plus') limit = 3;

    if (!user.active_sessions) user.active_sessions = [];

    // Clean up expired sessions (older than 7 days)
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    user.active_sessions = user.active_sessions.filter(s => (Date.now() - new Date(s.last_active || Date.now()).getTime()) < SEVEN_DAYS);

    // Determine sessions to remove:
    const targetSessionIds = (Array.isArray(logoutSessionIds) && logoutSessionIds.length > 0)
      ? logoutSessionIds
      : (Array.isArray(user.pending_logout_sessions) ? user.pending_logout_sessions : []);

    if (targetSessionIds.length > 0) {
      user.active_sessions = user.active_sessions.filter(s => {
        const sId = s._id ? s._id.toString() : '';
        return !targetSessionIds.includes(sId);
      });
    } else {
      user.active_sessions = [];
    }

    // Safety check: ensure user is under limit to guarantee they are never trapped
    if (user.active_sessions.length >= limit) {
      const excess = (user.active_sessions.length - limit) + 1;
      user.active_sessions.sort((a, b) => new Date(a.last_active || 0) - new Date(b.last_active || 0));
      user.active_sessions.splice(0, excess);
    }

    // Success: add new session
    const token = generateToken(user._id, 'owner');
    const ua = req.headers['user-agent'] || 'Unknown Device';
    let device_info = 'Unknown Device';
    if (ua !== 'Unknown Device') {
      const browserMatch = /(chrome|safari|firefox|edge|opera)/i.exec(ua);
      const browser = browserMatch ? browserMatch[0] : 'Browser';
      const osMatch = /(windows|macintosh|android|iphone|ipad|linux)/i.exec(ua);
      const os = osMatch ? osMatch[0] : 'OS';
      device_info = `${browser.charAt(0).toUpperCase() + browser.slice(1)} on ${os === 'macintosh' ? 'Mac' : os.charAt(0).toUpperCase() + os.slice(1)}`;
    }

    user.active_sessions.push({ token, device_info, last_active: Date.now() });

    // Clear OTP fields and reset attempt counter
    user.login_otp = undefined;
    user.login_otp_expire = undefined;
    user.login_otp_attempts = 0;
    user.login_otp_last_sent = undefined;
    user.pending_logout_sessions = undefined;

    user.markModified('active_sessions');
    await user.save({ validateBeforeSave: false });

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: 'owner'
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = req.user;
    let pendingRequest = null;
    let subscription = user.subscription;
    
    if (user.role === 'owner') {
      pendingRequest = await SubscriptionRequest.findOne({ cafe_id: user._id, status: 'pending' }).sort({ created_at: -1 });
      
      // Patch for existing users missing the embedded subscription or missing end_date
      if (!subscription || !subscription.end_date) {
        const activeSub = await Subscription.findOne({ cafe_id: user._id, status: 'active' }).sort({ created_at: -1 }).lean();
        if (activeSub) {
          subscription = {
            plan_name: activeSub.plan_name,
            start_date: activeSub.start_date,
            end_date: activeSub.end_date,
            status: activeSub.status
          };
          try {
            await Cafe.findByIdAndUpdate(user._id, { subscription });
          } catch(e) {}
        }
      }
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        ...(user.role === 'owner' && {
          logo: user.logo,
          phone: user.phone,
          address: user.address,
          upi_id: user.upi_id,
          tax_percentage: user.tax_percentage,
          razorpay_key_id: user.razorpay_key_id,
          billing_settings: user.billing_settings,
          theme_settings: user.theme_settings,
          subscription_status: user.subscription_status,
          subscription: subscription,
          upcoming_subscription: user.upcoming_subscription,
          pending_request: pendingRequest
        })
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout
// @route   POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    if (req.user && req.user.role === 'owner') {
      let token;
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
      }
      if (token && req.user.active_sessions) {
        req.user.active_sessions = req.user.active_sessions.filter(s => s.token !== token);
        await req.user.save({ validateBeforeSave: false });
      }
    }
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check email/phone availability
// @route   POST /api/auth/check-availability
const checkAvailability = async (req, res, next) => {
  try {
    const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const rawPhone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';

    let emailExists = false;
    let phoneExists = false;

    if (rawEmail) {
      emailExists = !!(await Cafe.findOne({ email: rawEmail }) || await Admin.findOne({ email: rawEmail }));
    }
    if (rawPhone) {
      phoneExists = !!(await Cafe.findOne({ phone: rawPhone }));
    }

    res.json({
      success: true,
      data: { emailExists, phoneExists }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register a new Cafe Owner
// @route   POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
    const address = typeof req.body?.address === 'string' ? req.body.address.trim() : '';
    const plan_name = typeof req.body?.plan_name === 'string' ? req.body.plan_name : 'starter';

    if (!name || !email || !password || !phone || !address) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const cafeExists = await Cafe.findOne({ email });
    if (cafeExists) {
      return res.status(400).json({
        success: false,
        message: 'A café with this email already exists'
      });
    }

    const cafe = await Cafe.create({
      name,
      email,
      password,
      phone,
      address
    });

    // All new registrations start with the platform Free Trial
    // Paid plans (pro, pro_plus) require explicit checkout via Razorpay or UPI
    const settings = await Settings.getSettings();
    const trialDays = settings.trial_days || 14;
    const trialEnd = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

    const subscriptionData = {
      cafe_id: cafe._id,
      plan_name: 'starter',
      price: 0,
      status: 'active',
      start_date: Date.now(),
      end_date: trialEnd,
      trial_end_date: trialEnd
    };

    await Subscription.create(subscriptionData);
    
    // Set embedded subscription in Cafe
    cafe.subscription_status = 'active';
    cafe.subscription = {
      plan_name: 'starter',
      start_date: subscriptionData.start_date,
      end_date: subscriptionData.end_date,
      status: 'active'
    };
    await cafe.save({ validateBeforeSave: false });

    try {
      const io = req.app.get('io');
      if (io) {
        io.to('admin-room').emit('new-cafe-registered', {
          id: cafe._id,
          name: cafe.name,
          email: cafe.email,
          plan: 'starter',
          created_at: cafe.created_at
        });
      }
    } catch (sockErr) {
      console.warn('Socket notification error on register:', sockErr.message);
    }

    const token = generateToken(cafe._id, 'owner');
  
    if (!cafe.active_sessions) cafe.active_sessions = [];
    cafe.active_sessions.push({ token, last_active: Date.now() });
    await cafe.save({ validateBeforeSave: false });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: cafe._id,
          name: cafe.name,
          email: cafe.email,
          role: 'owner'
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  verifyLoginOtp,
  getMe,
  logout,
  setPassword,
  forgotPassword,
  checkAvailability
};
