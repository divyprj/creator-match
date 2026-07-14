const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

function loadEnvSMTP() {
  try {
    const envPath = path.join(__dirname, '../../.env.local');
    if (!fs.existsSync(envPath)) return null;
    const content = fs.readFileSync(envPath, 'utf8');
    
    const hostMatch = content.match(/SMTP_HOST\s*=\s*(.+)/);
    const portMatch = content.match(/SMTP_PORT\s*=\s*(.+)/);
    const userMatch = content.match(/SMTP_USER\s*=\s*(.+)/);
    const passMatch = content.match(/SMTP_PASS\s*=\s*(.+)/);

    return {
      host: hostMatch ? hostMatch[1].trim() : null,
      port: portMatch ? parseInt(portMatch[1].trim()) : 465,
      user: userMatch ? userMatch[1].trim() : null,
      pass: passMatch ? passMatch[1].trim() : null
    };
  } catch (e) {
    return null;
  }
}

async function runTest() {
  const smtp = loadEnvSMTP();
  if (!smtp || !smtp.host || smtp.host.includes('smtp.gmail.com') && smtp.user.includes('your-email')) {
    console.error('ERROR: SMTP credentials are not set in .env.local file!');
    return;
  }

  console.log('Testing SMTP configuration connection...\n');

  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: {
        user: smtp.user,
        pass: smtp.pass
      }
    });

    // Verify SMTP connection
    console.log('Verifying connection credentials...');
    await transporter.verify();
    console.log('✔ SMTP Connection established successfully!');

    // Optionally send email if a recipient is specified as argv
    const recipient = process.argv[2];
    if (recipient) {
      console.log(`Sending test email to ${recipient}...`);
      await transporter.sendMail({
        from: `"Creator Match Test" <${smtp.user}>`,
        to: recipient,
        subject: 'Creator Match - SMTP Test Email',
        text: 'This is a test email sent from the local verification script to verify SMTP configurations.'
      });
      console.log('✔ Test email delivered successfully!');
    } else {
      console.log('\nPass a recipient email as an argument to test delivery, e.g.:');
      console.log('node src/tests/test_smtp.js myemail@gmail.com');
    }

  } catch (err) {
    console.error('SMTP test failed with error:', err);
  }
}

runTest();
