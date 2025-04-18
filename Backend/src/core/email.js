// core/Email.js
const nodemailer = require('nodemailer');
const htmlToText = require('html-to-text');
const MailjetTransport = require('nodemailer-mailjet-transport');
const { config } = require("../config/env");

module.exports = class Email {
  constructor(user, url = null, code = null) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.code = code;
    this.from = `Trustly EKYC <${config.email.from}>`;
  }

  newTransport() {
    if (config.email.service === 'mailjet') {
      return nodemailer.createTransport(MailjetTransport({
        auth: {
          apiKey: config.email.mailjet.apiKey,
          apiSecret: config.email.mailjet.secretKey,
        }
      }));
    }
    
    return nodemailer.createTransport({
      host: config.email.mailtrap.host,
      port: config.email.mailtrap.port,
      auth: {
        user: config.email.mailtrap.username,
        pass: config.email.mailtrap.password,
      }
    });
  }

  // Generate dynamic HTML for different email types tailored to Trustly EKYC in Algeria
  generateHTML(template) {
    switch (template) {
      case 'otp':
        return `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Votre code de vérification Trustly</h2>
            <p>Bonjour ${this.firstName},</p>
            <p>Votre code OTP pour finaliser votre vérification eKYC en Algérie est :</p>
            <h1>${this.code}</h1>
            <p>Ce code expire dans 10 minutes.</p>
            <p>Si vous n'avez pas demandé ce code, veuillez ignorer cet e-mail.</p>
          </div>
        `;
      case 'welcome':
        return `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Bienvenue sur Trustly EKYC!</h2>
            <p>Bonjour ${this.firstName},</p>
            <p>Votre compte est maintenant vérifié et prêt à l'emploi. Commencez à utiliser nos services de vérification d'identité en ligne.</p>
            <a href="${this.url}" style="padding:10px 20px; background:#0056b3; color:white; text-decoration:none;">Accéder au tableau de bord</a>
          </div>
        `;
      case 'passwordReset':
        return `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Réinitialisation de mot de passe Trustly</h2>
            <p>Bonjour ${this.firstName},</p>
            <p>Utilisez ce code pour réinitialiser votre mot de passe :</p>
            <h1>${this.code}</h1>
            <p>Ce code expire dans 5 minutes.</p>
            <p>Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet e-mail.</p>
          </div>
        `;
      case 'enrollment':
        return `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Confirmation d'inscription Trustly</h2>
            <p>Bonjour ${this.firstName},</p>
            <p>Vous êtes maintenant inscrit pour le service : <strong>${this.url}</strong>.</p>
            <p>Merci d'avoir choisi Trustly EKYC en Algérie.</p>
          </div>
        `;
      default:
        return `<p>Modèle d'e-mail non pris en charge</p>`;
    }
  }

  async send(template, subject) {
    const html = this.generateHTML(template);
    const mailOptions = { from: this.from, to: this.to, subject, html, text: htmlToText.htmlToText(html) };
    await this.newTransport().sendMail(mailOptions);
  }

  // Convenience methods
  async sendOTP() { await this.send('otp', 'Votre code de vérification Trustly'); }
  async sendWelcome() { await this.send('welcome', 'Bienvenue sur Trustly EKYC'); }
  async sendPasswordReset() { await this.send('passwordReset', 'Code de réinitialisation de mot de passe Trustly'); }
  async sendEnrollmentConfirmation(service) { this.url = service; await this.send('enrollment', 'Confirmation d inscription Trustly'); }
};
