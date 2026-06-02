import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_report_email(sender_email, sender_password, to_email, student_name, report_content):
    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = to_email
    msg['Subject'] = f"🚨 Comprehensive AI Viva & Performance Report: {student_name}"

    body = f"Dear Parent,\n\nPlease find the detailed AI generated academic and viva evaluation report for your ward, {student_name}.\n\n{report_content}\n\nBest Regards,\nFaculty Portal team."
    msg.attach(MIMEText(body, 'plain'))

    try:
        server = smtplib.SMTP('smtp.gmail.com', 587) 
        server.starttls()
        server.login(sender_email, sender_password)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print("Email sending failed:", e)
        return False