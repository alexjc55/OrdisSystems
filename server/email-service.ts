import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface EmailParams {
  to: string;
  from: string;
  fromName: string;
  subject: string;
  text?: string;
  html?: string;
}

interface EmailSettings {
  useSendgrid: boolean;
  // Nodemailer SMTP settings
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;
  // SendGrid settings
  sendgridApiKey?: string;
}

class EmailService {
  private nodemailerTransporter: Transporter | null = null;
  private sendgridInitialized: boolean = false;
  private settings: EmailSettings | null = null;

  constructor() {
    // Initialize default nodemailer
    this.initializeNodemailer();
    
    // Try to initialize SendGrid with environment variable if available
    if (process.env.SENDGRID_API_KEY) {
      this.initializeSendGrid(process.env.SENDGRID_API_KEY);
    }
  }

  private async initializeNodemailer(customSettings?: Partial<EmailSettings>) {
    try {
      // Use custom settings if provided, otherwise use safe defaults
      const port = customSettings?.smtpPort || 1025;
      const secure = customSettings?.smtpSecure || false;
      
      const config = {
        host: customSettings?.smtpHost || 'localhost',
        port: port,
        // Port 587 with secure=true is incorrect - use STARTTLS instead
        secure: port === 465 ? true : false, // Only use secure=true for port 465 (implicit SSL)
        auth: customSettings?.smtpUser && customSettings?.smtpPassword ? {
          user: customSettings.smtpUser,
          pass: customSettings.smtpPassword
        } : undefined,
        requireTLS: port === 587, // Use STARTTLS for port 587
        tls: {
          rejectUnauthorized: false,
          ciphers: 'SSLv3',
          secureProtocol: 'TLSv1_2_method'
        }
      };

      this.nodemailerTransporter = nodemailer.createTransport(config);
      
      console.log('📧 Nodemailer initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Nodemailer:', error);
    }
  }

  private initializeSendGrid(apiKey: string) {
    if (apiKey && apiKey.trim()) {
      try {
        sgMail.setApiKey(apiKey.trim());
        this.sendgridInitialized = true;
        console.log('✅ SendGrid email service initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize SendGrid:', error);
        this.sendgridInitialized = false;
      }
    }
  }

  async updateSettings(settings: EmailSettings) {
    this.settings = settings;
    
    // Initialize services based on settings
    if (settings.sendgridApiKey) {
      this.initializeSendGrid(settings.sendgridApiKey);
    }
    
    await this.initializeNodemailer(settings);
  }

  async sendEmail(params: EmailParams): Promise<boolean> {
    const { to, from, fromName, subject, text, html } = params;

    console.log('📧 Sending email:', {
      to,
      from: `${fromName} <${from}>`,
      subject,
      method: this.settings?.useSendgrid && this.sendgridInitialized ? 'SendGrid' : 'Nodemailer'
    });

    // Use SendGrid if it's preferred and available
    if (this.settings?.useSendgrid && this.sendgridInitialized) {
      return await this.sendViaSendGrid(params);
    }

    // Otherwise use Nodemailer (default)
    return await this.sendViaNodemailer(params);
  }

  private async sendViaSendGrid(params: EmailParams): Promise<boolean> {
    try {
      const msg = {
        to: params.to,
        from: {
          email: params.from,
          name: params.fromName
        },
        subject: params.subject,
        text: params.text || '',
        html: params.html || '',
        customArgs: {
          'entity_ref': `order-${Date.now()}`,
        }
      };

      await sgMail.send(msg);
      console.log('✅ Email sent successfully via SendGrid:', params.subject);
      return true;
    } catch (error: any) {
      console.error('❌ SendGrid email error:', error?.message);
      // Fallback to Nodemailer if SendGrid fails
      console.log('🔄 Falling back to Nodemailer...');
      return await this.sendViaNodemailer(params);
    }
  }

  private async sendViaNodemailer(params: EmailParams): Promise<boolean> {
    if (!this.nodemailerTransporter) {
      console.error('❌ Nodemailer not initialized');
      return false;
    }

    try {
      const msg = {
        from: `${params.fromName} <${params.from}>`,
        to: params.to,
        subject: params.subject,
        text: params.text || '',
        html: params.html || '',
        headers: {
          'X-Mailer': 'eDAHouse-OrderSystem',
          'X-Priority': '3',
          'X-Entity-Ref': `order-${Date.now()}`
        },
        // Fix base64 line length issues for better spam score
        textEncoding: 'quoted-printable',
        encoding: 'utf8'
      };

      const info = await this.nodemailerTransporter.sendMail(msg);
      console.log('✅ Email sent successfully via Nodemailer:', params.subject);
      console.log('📧 Message ID:', info.messageId);
      console.log('📧 Response:', info.response);
      console.log('📧 Accepted:', info.accepted);
      console.log('📧 Rejected:', info.rejected);
      return true;
    } catch (error: any) {
      console.error('❌ Nodemailer email error:', error?.message);
      return false;
    }
  }

  isConfigured(): boolean {
    return !!this.nodemailerTransporter || this.sendgridInitialized;
  }

  getStatus() {
    return {
      nodemailerReady: !!this.nodemailerTransporter,
      sendgridReady: this.sendgridInitialized,
      preferredMethod: this.settings?.useSendgrid && this.sendgridInitialized ? 'SendGrid' : 'Nodemailer'
    };
  }
}

// Singleton instance
export const emailService = new EmailService();

// New order email notification function
export async function sendNewOrderEmail(
  orderId: number,
  customerName: string,
  totalAmount: string,
  orderDetails: any,
  recipientEmail: string,
  fromEmail: string,
  fromName: string,
  language: string = 'ru'
): Promise<boolean> {
  
  // Multilingual email templates
  const templates = {
    ru: {
      subject: `🔔 Новый заказ #${orderId} - ${customerName}`,
      title: `Новый заказ #${orderId}`,
      customerLabel: 'Клиент:',
      totalLabel: 'Сумма заказа:',
      statusLabel: 'Статус:',
      addressLabel: 'Адрес доставки:',
      phoneLabel: 'Телефон:',
      paymentLabel: 'Способ оплаты:',
      notesLabel: 'Комментарии:',
      itemsLabel: 'Товары:',
      footer: 'Обработайте заказ в админ-панели',
      viewOrderButton: 'Посмотреть заказ',
      quantityLabel: 'Кол-во',
      amountLabel: 'Сумма',
      productLabel: 'Товар'
    },
    en: {
      subject: `🔔 New order #${orderId} - ${customerName}`,
      title: `New Order #${orderId}`,
      customerLabel: 'Customer:',
      totalLabel: 'Total amount:',
      statusLabel: 'Status:',
      addressLabel: 'Delivery address:',
      phoneLabel: 'Phone:',
      paymentLabel: 'Payment method:',
      notesLabel: 'Notes:',
      itemsLabel: 'Items:',
      footer: 'Process the order in admin panel',
      viewOrderButton: 'View order',
      quantityLabel: 'Quantity',
      amountLabel: 'Amount',
      productLabel: 'Product'
    },
    he: {
      subject: `🔔 הזמנה חדשה #${orderId} - ${customerName}`,
      title: `הזמנה חדשה #${orderId}`,
      customerLabel: 'לקוח:',
      totalLabel: 'סכום כולל:',
      statusLabel: 'סטטוס:',
      addressLabel: 'כתובת משלוח:',
      phoneLabel: 'טלפון:',
      paymentLabel: 'אמצעי תשלום:',
      notesLabel: 'הערות:',
      itemsLabel: 'פריטים:',
      footer: 'עבד על ההזמנה בפאנל הניהול',
      viewOrderButton: 'צפה בהזמנה',
      quantityLabel: 'כמות',
      amountLabel: 'סכום',
      productLabel: 'מוצר'
    },
    ar: {
      subject: `🔔 طلب جديد #${orderId} - ${customerName}`,
      title: `طلب جديد #${orderId}`,
      customerLabel: 'العميل:',
      totalLabel: 'المبلغ الإجمالي:',
      statusLabel: 'الحالة:',
      addressLabel: 'عنوان التسليم:',
      phoneLabel: 'الهاتف:',
      paymentLabel: 'طريقة الدفع:',
      notesLabel: 'الملاحظات:',
      itemsLabel: 'العناصر:',
      footer: 'قم بمعالجة الطلب في لوحة الإدارة',
      viewOrderButton: 'عرض الطلب',
      quantityLabel: 'الكمية',
      amountLabel: 'المبلغ',
      productLabel: 'المنتج'
    }
  };

  const template = templates[language as keyof typeof templates] || templates.ru;

  // Build items list for email
  const itemsHtml = orderDetails.items?.map((item: any) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.product?.name || template.productLabel}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}${item.product?.unit || 'кг'}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${item.totalPrice}₪</td>
    </tr>
  `).join('') || '';

  // HTML email template with anti-spam measures
  const html = `
    <!DOCTYPE html>
    <html dir="${language === 'he' || language === 'ar' ? 'rtl' : 'ltr'}">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${template.subject}</title>
    </head>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #f97316;">
          <h1 style="color: #f97316; margin: 0; font-size: 28px;">${template.title}</h1>
        </div>

        <!-- Order Info -->
        <div style="margin-bottom: 25px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #333;">${template.customerLabel}</td>
              <td style="padding: 10px 0; color: #666;">${customerName}</td>
            </tr>
            ${orderDetails.customerPhone ? `<tr>
              <td style="padding: 10px 0; font-weight: bold; color: #333;">${template.phoneLabel}</td>
              <td style="padding: 10px 0; color: #666;">${orderDetails.customerPhone}</td>
            </tr>` : ''}
            ${orderDetails.deliveryAddress ? `<tr>
              <td style="padding: 10px 0; font-weight: bold; color: #333;">${template.addressLabel}</td>
              <td style="padding: 10px 0; color: #666;">${orderDetails.deliveryAddress}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #333;">${template.totalLabel}</td>
              <td style="padding: 10px 0; color: #f97316; font-weight: bold; font-size: 18px;">${totalAmount}₪</td>
            </tr>
            ${orderDetails.paymentMethod ? `<tr>
              <td style="padding: 10px 0; font-weight: bold; color: #333;">${template.paymentLabel}</td>
              <td style="padding: 10px 0; color: #666;">${orderDetails.paymentMethod}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #333;">${template.statusLabel}</td>
              <td style="padding: 10px 0;">
                <span style="background-color: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
                  ${orderDetails.status || 'pending'}
                </span>
              </td>
            </tr>
            ${orderDetails.customerNotes ? `<tr>
              <td style="padding: 10px 0; font-weight: bold; color: #333;">${template.notesLabel}</td>
              <td style="padding: 10px 0; color: #666; font-style: italic;">${orderDetails.customerNotes}</td>
            </tr>` : ''}
          </table>
        </div>

        <!-- Order Items -->
        ${itemsHtml ? `
        <div style="margin-bottom: 25px;">
          <h3 style="color: #333; margin-bottom: 15px;">${template.itemsLabel}</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 12px; text-align: left; font-weight: bold; border-bottom: 2px solid #ddd;">${template.productLabel}</th>
                <th style="padding: 12px; text-align: center; font-weight: bold; border-bottom: 2px solid #ddd;">${template.quantityLabel}</th>
                <th style="padding: 12px; text-align: right; font-weight: bold; border-bottom: 2px solid #ddd;">${template.amountLabel}</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>
        ` : ''}

        <!-- Action Button -->
        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.REPLIT_APP_URL || 'http://localhost:5000'}/admin/orders" 
             style="background-color: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            ${template.viewOrderButton}
          </a>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 14px;">
          <p>${template.footer}</p>
          <p style="margin: 5px 0 0 0;">eDAHouse - ${language === 'ru' ? 'Система управления заказами' : language === 'en' ? 'Order Management System' : language === 'he' ? 'מערכת ניהול הזמנות' : 'نظام إدارة الطلبات'}</p>
        </div>

      </div>
    </body>
    </html>
  `;

  // Plain text version for better deliverability
  const text = `
${template.title}

${template.customerLabel} ${customerName}
${orderDetails.customerPhone ? `${template.phoneLabel} ${orderDetails.customerPhone}` : ''}
${orderDetails.deliveryAddress ? `${template.addressLabel} ${orderDetails.deliveryAddress}` : ''}
${template.totalLabel} ${totalAmount}₪
${orderDetails.paymentMethod ? `${template.paymentLabel} ${orderDetails.paymentMethod}` : ''}
${template.statusLabel} ${orderDetails.status || 'pending'}
${orderDetails.customerNotes ? `${template.notesLabel} ${orderDetails.customerNotes}` : ''}

${template.footer}
  `;

  return await emailService.sendEmail({
    to: recipientEmail,
    from: fromEmail,
    fromName,
    subject: template.subject,
    text,
    html
  });
}