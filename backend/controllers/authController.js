const Admin = require('../models/Admin');
const Cafe = require('../models/Cafe');
const Subscription = require('../models/Subscription');
const Settings = require('../models/Settings');
const SubscriptionRequest = require('../models/SubscriptionRequest');
const { generateToken } = require('../utils/jwt');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const { resetPasswordTemplate } = require('../utils/emailTemplates');

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
    const { email, password } = req.body;

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

    // Check if cafe is suspended
    if (role === 'owner' && !user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Contact support.'
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

    const token = generateToken(user._id, role);

    res.json({
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

// @desc    Get current logged in user
// @route   GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = req.user;
    let pendingRequest = null;
    
    if (user.role === 'owner') {
      pendingRequest = await SubscriptionRequest.findOne({ cafe_id: user._id, status: 'pending' }).sort({ created_at: -1 });
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
          subscription_status: user.subscription_status,
          subscription: user.subscription, // Use embedded subscription
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
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
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

    if (plan_name === 'free' || !plan_name) {
      // Free trial — gets Pro plan features for trial_days
      const trialDays = settings.trial_days || 14;
      const trialEnd = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

      subscriptionData = {
        cafe_id: cafe._id,
        plan_name: 'free',
        price: 0,
        status: 'active',
        start_date: Date.now(),
        end_date: trialEnd,
        trial_end_date: trialEnd
      };
    } else {
      // Starter or Pro paid plan
      const planPrice = plan_name === 'pro' ? (settings.pro_price || 499) : (settings.starter_price || 299);
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

    try {
      const io = req.app.get('io');
      if (io) {
        io.to('admin-room').emit('new-cafe-registered', {
          id: cafe._id,
          name: cafe.name,
          email: cafe.email,
          plan: plan_name || 'free',
          created_at: cafe.createdAt
        });
      }
    } catch (sockErr) {
      console.warn('Socket notification error on register:', sockErr.message);
    }

    const token = generateToken(cafe._id, 'owner');

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
  getMe,
  logout,
  setPassword,
  forgotPassword,
  checkAvailability
};
