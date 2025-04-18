class ApiResponse {
    constructor(statusCode, data = null, message = null) {
      this.statusCode = statusCode;
      this.status = statusCode >= 200 && statusCode < 300 ? 'success' : 'fail';
      this.data = data;
      this.message = message;
    }
  
    send(res) {
      return res.status(this.statusCode).json({
        status: this.status,
        message: this.message,
        data: this.data
      });
    }
  }
  
  module.exports = ApiResponse;