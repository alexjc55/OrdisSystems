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
      
      // Fix HELO_NO_DOMAIN - ensure proper FQDN format
      // Try different HELO formats based on SMTP host
      let heloName = 'localhost';
      if (customSettings?.smtpHost) {
        if (customSettings.smtpHost === 'ordis.co.il') {
          // For ordis.co.il, try mail subdomain format that matches email servers
          heloName = 'mail.ordis.co.il';
        } else {
          heloName = customSettings.smtpHost;
        }
      }
      
      const config = {
        host: customSettings?.smtpHost || 'localhost',
        port: port,
        // HELO name must be proper FQDN to avoid HELO_NO_DOMAIN
        name: heloName,
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
        // Fix BASE64_LENGTH_79_INF - use quoted-printable encoding
        encoding: 'utf8',
        textEncoding: 'quoted-printable',
        htmlEncoding: 'quoted-printable'
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
  language: string = 'ru',
  storeName?: string,
  baseUrl?: string
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
      deliveryDateLabel: 'Дата доставки:',
      deliveryTimeLabel: 'Время доставки:',
      footer: 'Обработайте заказ в админ-панели',
      viewOrderButton: 'Посмотреть заказ',
      quantityLabel: 'Кол-во',
      amountLabel: 'Сумма',
      productLabel: 'Товар',
      statusTranslations: {
        pending: 'Ожидает',
        confirmed: 'Подтвержден',
        preparing: 'Готовится',
        ready: 'Готов',
        delivered: 'Доставлен',
        cancelled: 'Отменен'
      },
      defaultUnit: 'кг'
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
      deliveryDateLabel: 'Delivery date:',
      deliveryTimeLabel: 'Delivery time:',
      footer: 'Process the order in admin panel',
      viewOrderButton: 'View order',
      quantityLabel: 'Quantity',
      amountLabel: 'Amount',
      productLabel: 'Product',
      statusTranslations: {
        pending: 'Pending',
        confirmed: 'Confirmed',
        preparing: 'Preparing',
        ready: 'Ready',
        delivered: 'Delivered',
        cancelled: 'Cancelled'
      },
      defaultUnit: 'kg'
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
      deliveryDateLabel: 'תאריך משלוח:',
      deliveryTimeLabel: 'שעת משלוח:',
      footer: 'עבד על ההזמנה בפאנל הניהול',
      viewOrderButton: 'צפה בהזמנה',
      quantityLabel: 'כמות',
      amountLabel: 'סכום',
      productLabel: 'מוצר',
      statusTranslations: {
        pending: 'ממתין',
        confirmed: 'מאושר',
        preparing: 'בהכנה',
        ready: 'מוכן',
        delivered: 'נמסר',
        cancelled: 'בוטל'
      },
      defaultUnit: 'ק"ג'
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
      deliveryDateLabel: 'تاريخ التسليم:',
      deliveryTimeLabel: 'وقت التسليم:',
      footer: 'قم بمعالجة الطلب في لوحة الإدارة',
      viewOrderButton: 'عرض الطلب',
      quantityLabel: 'الكمية',
      amountLabel: 'المبلغ',
      productLabel: 'المنتج',
      statusTranslations: {
        pending: 'قيد الانتظار',
        confirmed: 'مؤكد',
        preparing: 'يتم التحضير',
        ready: 'جاهز',
        delivered: 'تم التسليم',
        cancelled: 'ملغي'
      },
      defaultUnit: 'كغ'
    }
  };

  const template = templates[language as keyof typeof templates] || templates.ru;
  
  // Get translated status
  const statusText = template.statusTranslations[orderDetails.status as keyof typeof template.statusTranslations] || orderDetails.status || 'pending';

  // Translate delivery time keys (half_day_first, half_day_second, morning, afternoon)
  const formatDeliveryTime = (time: string): string => {
    if (!time) return time;
    const translations: Record<string, Record<string, string>> = {
      half_day_first: { ru: 'Первая половина дня', en: 'First half of the day', he: 'חצי יום ראשון', ar: 'النصف الأول من اليوم' },
      half_day_second: { ru: 'Вторая половина дня', en: 'Second half of the day', he: 'חצי יום שני', ar: 'النصف الثاني من اليوم' },
      morning: { ru: 'Первая половина дня', en: 'First half of the day', he: 'חצי יום ראשון', ar: 'النصف الأول من اليوم' },
      afternoon: { ru: 'Вторая половина дня', en: 'Second half of the day', he: 'חצי יום שני', ar: 'النصف الثاني من اليوم' },
    };
    return translations[time]?.[language] || translations[time]?.['en'] || time;
  };
  const deliveryTimeFormatted = formatDeliveryTime(orderDetails.deliveryTime || '');

  // Function to format quantity with units
  const formatQuantityWithUnit = (quantity: number, unit: string, language: string): string => {
    const unitTranslations: { [key: string]: { [lang: string]: string } } = {
      'piece': { ru: 'шт', en: 'piece', he: 'יחידה', ar: 'قطعة' },
      'portion': { ru: 'порц.', en: 'portion', he: 'מנה', ar: 'حصة' },
      'ml': { ru: 'мл', en: 'ml', he: 'מ״ל', ar: 'مل' },
      'l': { ru: 'л', en: 'l', he: 'ליטר', ar: 'لتر' },
      'kg': { ru: 'кг', en: 'kg', he: 'ק"ג', ar: 'كغ' },
      'g': { ru: 'г', en: 'g', he: 'גר׳', ar: 'غ' }
    };
    
    // Handle weight units (100g, 200g, etc.)
    const weightMatch = unit.match(/^(\d+)g$/);
    if (weightMatch) {
      const translatedUnit = unitTranslations['g'][language] || unitTranslations['g']['en'];
      return `${quantity}${translatedUnit}`;
    }
    
    // Handle regular units (piece, portion, ml, etc.)
    const translatedUnit = unitTranslations[unit]?.[language] || unitTranslations[unit]?.en || unit;
    return `${quantity} ${translatedUnit}`;
  };

  // Build items list for email
  const itemsHtml = orderDetails.items?.map((item: any) => {
    const originalUnit = item.product?.unit || template.defaultUnit;
    const formattedQuantity = formatQuantityWithUnit(item.quantity, originalUnit, language);
    
    return `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.product?.name || template.productLabel}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${formattedQuantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${item.totalPrice}₪</td>
    </tr>`;
  }).join('') || '';

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
            ${orderDetails.deliveryDate ? `<tr>
              <td style="padding: 10px 0; font-weight: bold; color: #333;">${template.deliveryDateLabel}</td>
              <td style="padding: 10px 0; color: #666;">${orderDetails.deliveryDate}</td>
            </tr>` : ''}
            ${orderDetails.deliveryTime ? `<tr>
              <td style="padding: 10px 0; font-weight: bold; color: #333;">${template.deliveryTimeLabel}</td>
              <td style="padding: 10px 0; color: #666;">${deliveryTimeFormatted}</td>
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
                  ${statusText}
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
          <a href="${baseUrl || process.env.REPLIT_APP_URL || 'http://localhost:5000'}/admin?tab=orders" 
             style="background-color: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            ${template.viewOrderButton}
          </a>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 14px;">
          <p>${template.footer}</p>
          <p style="margin: 5px 0 0 0;">${storeName || fromName || 'eDAHouse'} - ${language === 'ru' ? 'Система управления заказами' : language === 'en' ? 'Order Management System' : language === 'he' ? 'מערכת ניהול הזמנות' : 'نظام إدارة الطلبات'}</p>
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
${orderDetails.deliveryDate ? `${template.deliveryDateLabel} ${orderDetails.deliveryDate}` : ''}
${orderDetails.deliveryTime ? `${template.deliveryTimeLabel} ${deliveryTimeFormatted}` : ''}
${template.totalLabel} ${totalAmount}₪
${orderDetails.paymentMethod ? `${template.paymentLabel} ${orderDetails.paymentMethod}` : ''}
${template.statusLabel} ${statusText}
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

// New function for sending guest order emails
export async function sendGuestOrderEmail(
  orderId: number,
  guestName: string,
  guestEmail: string,
  totalAmount: string,
  orderDetails: any,
  guestAccessToken: string,
  claimToken: string,
  fromEmail: string,
  fromName: string,
  language: string = 'ru',
  storeName?: string,
  baseUrl?: string
): Promise<boolean> {
  
  // Multilingual email templates for guest orders
  const templates = {
    ru: {
      subject: `🛍️ Ваш заказ #${orderId} подтвержден!`,
      title: `Спасибо за ваш заказ!`,
      greeting: `Здравствуйте, ${guestName}!`,
      confirmationText: `Ваш заказ #${orderId} успешно принят и обрабатывается.`,
      totalLabel: 'Сумма заказа:',
      statusLabel: 'Статус:',
      addressLabel: 'Адрес доставки:',
      phoneLabel: 'Телефон:',
      paymentLabel: 'Способ оплаты:',
      itemsLabel: 'Заказанные товары:',
      viewOrderButton: 'Посмотреть детали заказа',
      viewOrderText: 'Вы можете отслеживать статус заказа по ссылке:',
      registrationTitle: 'Создайте аккаунт для удобства!',
      registrationText: 'Зарегистрируйтесь, чтобы легко отслеживать все ваши заказы, сохранить адрес доставки и получать персональные предложения.',
      registerButton: 'Зарегистрироваться и привязать заказ',
      footer: `С уважением,<br>Команда ${storeName || 'eDAHouse'}`,
      quantityLabel: 'Кол-во',
      amountLabel: 'Сумма',
      productLabel: 'Товар',
      statusTranslations: {
        pending: 'Ожидает',
        confirmed: 'Подтвержден',
        preparing: 'Готовится',
        ready: 'Готов',
        delivered: 'Доставлен',
        cancelled: 'Отменен'
      },
      defaultUnit: 'кг'
    },
    en: {
      subject: `🛍️ Your order #${orderId} is confirmed!`,
      title: `Thank you for your order!`,
      greeting: `Hello, ${guestName}!`,
      confirmationText: `Your order #${orderId} has been successfully received and is being processed.`,
      totalLabel: 'Order total:',
      statusLabel: 'Status:',
      addressLabel: 'Delivery address:',
      phoneLabel: 'Phone:',
      paymentLabel: 'Payment method:',
      itemsLabel: 'Ordered items:',
      viewOrderButton: 'View order details',
      viewOrderText: 'You can track your order status using this link:',
      registrationTitle: 'Create an account for convenience!',
      registrationText: 'Register to easily track all your orders, save delivery address, and receive personalized offers.',
      registerButton: 'Register and link order',
      footer: `Best regards,<br>Team ${storeName || 'eDAHouse'}`,
      quantityLabel: 'Quantity',
      amountLabel: 'Amount',
      productLabel: 'Product',
      statusTranslations: {
        pending: 'Pending',
        confirmed: 'Confirmed',
        preparing: 'Preparing',
        ready: 'Ready',
        delivered: 'Delivered',
        cancelled: 'Cancelled'
      },
      defaultUnit: 'kg'
    },
    he: {
      subject: `🛍️ ההזמנה שלך #${orderId} אושרה!`,
      title: `תודה על ההזמנה שלך!`,
      greeting: `שלום, ${guestName}!`,
      confirmationText: `ההזמנה שלך #${orderId} התקבלה בהצלחה ונמצאת בטיפול.`,
      totalLabel: 'סכום הזמנה:',
      statusLabel: 'סטטוס:',
      addressLabel: 'כתובת משלוח:',
      phoneLabel: 'טלפון:',
      paymentLabel: 'אמצעי תשלום:',
      itemsLabel: 'פריטים שהוזמנו:',
      viewOrderButton: 'צפה בפרטי ההזמנה',
      viewOrderText: 'ניתן לעקוב אחר סטטוס ההזמנה בקישור:',
      registrationTitle: 'צור חשבון לנוחות!',
      registrationText: 'הירשם כדי לעקוב בקלות אחר כל ההזמנות שלך, לשמור כתובת משלוח ולקבל הצעות אישיות.',
      registerButton: 'הירשם וקשר את ההזמנה',
      footer: `בברכה,<br>צוות ${storeName || 'eDAHouse'}`,
      quantityLabel: 'כמות',
      amountLabel: 'סכום',
      productLabel: 'מוצר',
      statusTranslations: {
        pending: 'ממתין',
        confirmed: 'אושר',
        preparing: 'בהכנה',
        ready: 'מוכן',
        delivered: 'נמסר',
        cancelled: 'בוטל'
      },
      defaultUnit: 'ק״ג'
    },
    ar: {
      subject: `🛍️ تم تأكيد طلبك #${orderId}!`,
      title: `شكراً لك على طلبك!`,
      greeting: `مرحباً، ${guestName}!`,
      confirmationText: `تم استلام طلبك #${orderId} بنجاح وجاري معالجته.`,
      totalLabel: 'إجمالي الطلب:',
      statusLabel: 'الحالة:',
      addressLabel: 'عنوان التسليم:',
      phoneLabel: 'الهاتف:',
      paymentLabel: 'طريقة الدفع:',
      itemsLabel: 'العناصر المطلوبة:',
      viewOrderButton: 'عرض تفاصيل الطلب',
      viewOrderText: 'يمكنك تتبع حالة طلبك باستخدام هذا الرابط:',
      registrationTitle: 'أنشئ حساباً للراحة!',
      registrationText: 'سجل لتتبع جميع طلباتك بسهولة، واحفظ عنوان التسليم، واحصل على عروض شخصية.',
      registerButton: 'سجل وربط الطلب',
      footer: `مع أطيب التحيات،<br>فريق ${storeName || 'eDAHouse'}`,
      quantityLabel: 'الكمية',
      amountLabel: 'المبلغ',
      productLabel: 'المنتج',
      statusTranslations: {
        pending: 'قيد الانتظار',
        confirmed: 'مؤكد',
        preparing: 'قيد التحضير',
        ready: 'جاهز',
        delivered: 'تم التسليم',
        cancelled: 'ملغى'
      },
      defaultUnit: 'كجم'
    }
  };

  const template = templates[language as keyof typeof templates] || templates.ru;
  const isRTL = ['he', 'ar'].includes(language);

  // Create order view URL with guest access token
  const finalBaseUrl = baseUrl || process.env.REPLIT_APP_URL || 'https://eDAHouse.com';
  const orderViewUrl = `${finalBaseUrl}/guest-order/${guestAccessToken}`;
  
  // Create registration URL with claim token and return to profile orders
  const registerUrl = `${finalBaseUrl}/auth?claimToken=${claimToken}&returnTo=${encodeURIComponent('/profile?tab=orders')}`;

  // Function to format quantity with units (same as in admin emails)
  const formatQuantityWithUnit = (quantity: number, unit: string, language: string): string => {
    const unitTranslations: { [key: string]: { [lang: string]: string } } = {
      'piece': { ru: 'шт', en: 'piece', he: 'יחידה', ar: 'قطعة' },
      'portion': { ru: 'порц.', en: 'portion', he: 'מנה', ar: 'حصة' },
      'ml': { ru: 'мл', en: 'ml', he: 'מ״ל', ar: 'مل' },
      'l': { ru: 'л', en: 'l', he: 'ליטר', ar: 'لتر' },
      'kg': { ru: 'кг', en: 'kg', he: 'ק"ג', ar: 'كغ' },
      'g': { ru: 'г', en: 'g', he: 'גר׳', ar: 'غ' }
    };
    
    // Handle weight units (100g, 200g, etc.)
    const weightMatch = unit.match(/^(\d+)g$/);
    if (weightMatch) {
      const translatedUnit = unitTranslations['g'][language] || unitTranslations['g']['en'];
      return `${quantity}${translatedUnit}`;
    }
    
    // Handle regular units (piece, portion, ml, etc.)
    const translatedUnit = unitTranslations[unit]?.[language] || unitTranslations[unit]?.en || unit;
    return `${quantity} ${translatedUnit}`;
  };

  // Format items list (same format as admin emails)
  let itemsHtml = '';
  if (orderDetails.items && Array.isArray(orderDetails.items)) {
    const itemRows = orderDetails.items.map((item: any) => {
      const originalUnit = item.product?.unit || template.defaultUnit;
      const formattedQuantity = formatQuantityWithUnit(item.quantity, originalUnit, language);
      
      return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: ${isRTL ? 'right' : 'left'};">${item.product?.name || template.productLabel}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${formattedQuantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${item.totalPrice}₪</td>
      </tr>`;
    }).join('');
    
    itemsHtml = `
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd; ${isRTL ? 'direction: rtl;' : ''}">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 12px; text-align: ${isRTL ? 'right' : 'left'}; font-weight: bold; border-bottom: 2px solid #ddd;">${template.productLabel}</th>
            <th style="padding: 12px; text-align: center; font-weight: bold; border-bottom: 2px solid #ddd;">${template.quantityLabel}</th>
            <th style="padding: 12px; text-align: right; font-weight: bold; border-bottom: 2px solid #ddd;">${template.amountLabel}</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
    `;
  }

  // Construct the HTML email
  const html = `
    <!DOCTYPE html>
    <html lang="${language}" ${isRTL ? 'dir="rtl"' : ''}>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${template.title}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; ${isRTL ? 'direction: rtl;' : ''}">
      <header style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2c3e50; margin-bottom: 10px;">${template.title}</h1>
        <div style="width: 50px; height: 3px; background-color: #3498db; margin: 0 auto;"></div>
      </header>
      
      <main>
        <p style="font-size: 16px; margin-bottom: 15px;"><strong>${template.greeting}</strong></p>
        
        <p style="margin-bottom: 20px;">${template.confirmationText}</p>
        
        <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 5px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #495057; margin-top: 0;">📋 ${template.title} #${orderId}</h3>
          <p><strong>${template.totalLabel}</strong> ₪${totalAmount}</p>
          <p><strong>${template.statusLabel}</strong> ${template.statusTranslations[orderDetails.status as keyof typeof template.statusTranslations] || orderDetails.status}</p>
          ${orderDetails.customerPhone ? `<p><strong>${template.phoneLabel}</strong> ${orderDetails.customerPhone}</p>` : ''}
          ${orderDetails.deliveryAddress ? `<p><strong>${template.addressLabel}</strong> ${orderDetails.deliveryAddress}</p>` : ''}
          ${orderDetails.paymentMethod ? `<p><strong>${template.paymentLabel}</strong> ${orderDetails.paymentMethod}</p>` : ''}
        </div>
        
        ${itemsHtml ? `
        <div style="margin: 20px 0;">
          <h3 style="color: #495057;">${template.itemsLabel}</h3>
          ${itemsHtml}
        </div>
        ` : ''}
        
        <div style="text-align: center; margin: 30px 0;">
          <p>${template.viewOrderText}</p>
          <a href="${orderViewUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px;">${template.viewOrderButton}</a>
        </div>
        
        <div style="background-color: #e8f5e8; border: 1px solid #c3e6c3; border-radius: 5px; padding: 20px; margin: 30px 0;">
          <h3 style="color: #155724; margin-top: 0;">✨ ${template.registrationTitle}</h3>
          <p style="color: #155724; margin-bottom: 15px;">${template.registrationText}</p>
          <div style="text-align: center;">
            <a href="${registerUrl}" style="display: inline-block; background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">${template.registerButton}</a>
          </div>
        </div>
      </main>
      
      <footer style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d;">
        <p>${template.footer}</p>
      </footer>
    </body>
    </html>
  `;

  // Text version for better compatibility
  const text = `
    ${template.greeting}
    
    ${template.confirmationText}
    
    ${template.title} #${orderId}
    ${template.totalLabel} ₪${totalAmount}
    ${template.statusLabel} ${template.statusTranslations[orderDetails.status as keyof typeof template.statusTranslations] || orderDetails.status}
    ${orderDetails.customerPhone ? `${template.phoneLabel} ${orderDetails.customerPhone}` : ''}
    ${orderDetails.deliveryAddress ? `${template.addressLabel} ${orderDetails.deliveryAddress}` : ''}
    ${orderDetails.paymentMethod ? `${template.paymentLabel} ${orderDetails.paymentMethod}` : ''}
    
    ${template.viewOrderText}
    ${orderViewUrl}
    
    ${template.registrationTitle}
    ${template.registrationText}
    ${registerUrl}
    
    ${template.footer.replace(/<br>/g, '\n').replace(/<[^>]*>/g, '')}
  `;

  try {
    return await emailService.sendEmail({
      to: guestEmail,
      from: fromEmail,
      fromName: fromName,
      subject: template.subject,
      text: text,
      html: html
    });
  } catch (error) {
    console.error('Error sending guest order email:', error);
    return false;
  }
}