const Admin = require('../models/Admin');
const Cafe = require('../models/Cafe');
const Subscription = require('../models/Subscription');
const Settings = require('../models/Settings');
const SubscriptionRequest = require('../models/SubscriptionRequest');
const { generateToken } = require('../utils/jwt');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const { resetPasswordTemplate, deviceLogoutOtpTemplate } = require('../utils/emailTemplates');

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
const forgotPassword = async (req, res, next) => {
  try {
    const cafe = await Cafe.findOne({ email: req.body.email });

    if (!cafe) {
      return res.status(404).json({ success: false, message: 'There is no user with that email' });
    }

    // Get reset token
    const resetToken = cafe.getResetPasswordToken();

    await cafe.save({ validateBeforeSave: false });

    // Create reset url
    const resetUrl = `${req.protocol}://${req.get('host').replace('5000', '3000')}/set-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;
    const html = resetPasswordTemplate(resetUrl);

    try {
      await sendEmail({
        email: cafe.email,
        subject: 'Password reset token',
        message,
        html
      });

      res.status(200).json({ success: true, data: 'Email sent' });
    } catch (error) {
      console.error(error);
      cafe.resetPasswordToken = undefined;
      cafe.resetPasswordExpire = undefined;

      await cafe.save({ validateBeforeSave: false });

      return res.status(500).json({ success: false, message: 'Email could not be sent' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Set password via email token
// @route   POST /api/auth/set-password/:token
const setPassword = async (req, res, next) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    // Find user by token and check expiry
    const cafe = await Cafe.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!cafe) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Set new password
    cafe.password = req.body.password;
    cafe.resetPasswordToken = undefined;
    cafe.resetPasswordExpire = undefined;
    
    await cafe.save();

    const token = generateToken(cafe._id, 'owner');

    res.json({
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

// @desc    Login (Admin or Cafe Owner)
// @route   POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password, forceLogout, logoutSessionIds } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check admin first
    let user = await Admin.findOne({ email }).select('+password');
    let role = 'superadmin';

    // If not admin, check cafe owner
    if (!user) {
      user = await Cafe.findOne({ email }).select('+password');
      role = 'owner';
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check maintenance mode for owners
    if (role === 'owner') {
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
        // The user clicked "Log Out Selected" and we need to send an OTP
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Save OTP to user document
        user.login_otp = otp;
        user.login_otp_expire = Date.now() + 10 * 60 * 1000; // 10 minutes
        user.pending_logout_sessions = Array.isArray(logoutSessionIds) ? logoutSessionIds : [];
        await user.save({ validateBeforeSave: false });

        console.log(`🔐 [DEVICE LOGOUT OTP] Generated code for ${user.email}: ${otp}`);

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
    const { email, otp, forceLogout, logoutSessionIds } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and OTP'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    const user = await Cafe.findOne({ 
      email: cleanEmail,
      login_otp: cleanOtp,
      login_otp_expire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP. Please verify the code or request a new one.'
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
      // Clear all active sessions if no specific target is given
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

    // Clear OTP fields
    user.login_otp = undefined;
    user.login_otp_expire = undefined;
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
          // Also save it to the DB so it's permanently fixed
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
          subscription: subscription, // Use embedded subscription (patched if missing)
          upcoming_subscription: user.upcoming_subscription, // Add upcoming subscription
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
    const { email, phone } = req.body;
    let emailExists = false;
    let phoneExists = false;

    if (email) {
      emailExists = !!(await Cafe.findOne({ email }) || await Admin.findOne({ email }));
    }
    if (phone) {
      phoneExists = !!(await Cafe.findOne({ phone }));
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
    const { name, email, password, phone, address, plan_name } = req.body;

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

    // Determine subscription details based on plan
    const settings = await Settings.getSettings();
    let subscriptionData;

    if (plan_name === 'starter' || !plan_name) {
      // Free trial — gets Pro plan features for trial_days
      const trialDays = settings.trial_days || 14;
      const trialEnd = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

      subscriptionData = {
        cafe_id: cafe._id,
        plan_name: 'starter',
        price: 0,
        status: 'active',
        start_date: Date.now(),
        end_date: trialEnd,
        trial_end_date: trialEnd
      };
    } else {
      // Starter or Pro paid plan
      const planPrice = plan_name === 'pro_plus' ? (settings.pro_price || 499) : (settings.starter_price || 299);
      subscriptionData = {
        cafe_id: cafe._id,
        plan_name: plan_name,
        price: planPrice,
        status: 'active',
        start_date: Date.now(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      };
    }

    await Subscription.create(subscriptionData);
    
    // Set embedded subscription in Cafe
    cafe.subscription_status = 'active';
    cafe.subscription = {
      plan_name: subscriptionData.plan_name,
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
          plan: plan_name || 'starter',
          created_at: cafe.createdAt
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
