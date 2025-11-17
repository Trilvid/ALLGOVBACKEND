const crypto = require('crypto');

// Generate unique reference
exports.generateReference = () => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `REF-${timestamp}-${random}`;
};

// Generate transaction ID
exports.generateTransactionId = () => {
  const timestamp = Date.now().toString().slice(-10);
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `TXN${timestamp}${random}`;
};

// Format currency
exports.formatCurrency = (amount, currency = 'NGN') => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

// Format date
exports.formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Calculate percentage
exports.calculatePercentage = (part, total) => {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
};

// Paginate results
exports.paginate = (data, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const results = {
    data: data.slice(startIndex, endIndex),
    pagination: {
      current: page,
      total: Math.ceil(data.length / limit),
      count: data.length
    }
  };

  if (endIndex < data.length) {
    results.pagination.next = page + 1;
  }

  if (startIndex > 0) {
    results.pagination.prev = page - 1;
  }

  return results;
};

// Generate OTP
exports.generateOTP = (length = 6) => {
  const digits = '0123456789';
  let OTP = '';
  for (let i = 0; i < length; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }
  return OTP;
};

// Mask email
exports.maskEmail = (email) => {
  const [username, domain] = email.split('@');
  const maskedUsername = username.charAt(0) + '*'.repeat(username.length - 2) + username.charAt(username.length - 1);
  return `${maskedUsername}@${domain}`;
};

// Mask phone number
exports.maskPhone = (phone) => {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};

// Calculate expiry date
exports.calculateExpiryDate = (startDate, frequency) => {
  const date = new Date(startDate);
  
  switch(frequency) {
    case 'Monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'Quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'Annually':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setMonth(date.getMonth() + 1);
  }
  
  return date;
};

// Validate file type
exports.isValidImageType = (mimetype) => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  return validTypes.includes(mimetype);
};

// Generate random color
exports.generateRandomColor = () => {
  return '#' + Math.floor(Math.random() * 16777215).toString(16);
};

// Sleep/delay function
exports.sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};