const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendOTP = async (email, otp) => {
    try {
        const mailOptions = {
            from: `Garbage Reporting App <${process.env.EMAIL_USER}>`, // Fixed template literal and removed semicolon
            to: email,
            subject: "Your OTP for Registration",
            text: `Your OTP code is: ${otp}. It will expire in 5 minutes.` // Fixed template literal
        };

        await transporter.sendMail(mailOptions);
        console.log(`OTP sent to ${email}`);
    } catch (error) {
        console.error("Error sending OTP:", error);
    }
};

module.exports = sendOTP;