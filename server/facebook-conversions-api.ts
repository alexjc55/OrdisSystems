import crypto from 'crypto';

/**
 * SHA-256 hash function for Facebook Conversions API
 * Facebook requires all PII to be hashed with SHA-256
 */
function sha256Hash(data: string): string {
  if (!data) return '';
  // Normalize: lowercase and trim whitespace
  const normalized = data.toLowerCase().trim();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Interface for Facebook Conversions API event data
 */
interface FacebookEventData {
  event_name: string;
  event_time: number;
  event_id?: string;
  action_source: 'website';
  event_source_url: string;
  user_data: {
    em?: string; // Email (hashed)
    ph?: string; // Phone (hashed)
    fn?: string; // First name (hashed)
    ln?: string; // Last name (hashed)
    client_ip_address?: string;
    client_user_agent?: string;
    fbp?: string; // Facebook browser ID from _fbp cookie
    fbc?: string; // Facebook click ID from _fbc cookie or fbclid parameter
  };
  custom_data?: {
    currency?: string;
    value?: number;
    content_ids?: string[];
    content_type?: string;
    contents?: Array<{
      id: string;
      quantity: number;
      item_price: number;
    }>;
    num_items?: number;
  };
}

/**
 * Interface for order data to send to Facebook
 */
export interface FacebookOrderData {
  orderId: number;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  totalAmount: number;
  currency?: string;
  items?: Array<{
    productId: number;
    quantity: number;
    price: number;
  }>;
  eventSourceUrl: string;
  clientIp?: string;
  clientUserAgent?: string;
  fbp?: string; // From _fbp cookie
  fbc?: string; // From _fbc cookie or fbclid URL parameter
}

/**
 * Send Purchase event to Facebook Conversions API
 */
export async function sendFacebookPurchaseEvent(
  pixelId: string,
  accessToken: string,
  orderData: FacebookOrderData
): Promise<boolean> {
  try {
    // Prepare user data with hashing
    const userData: FacebookEventData['user_data'] = {
      client_ip_address: orderData.clientIp,
      client_user_agent: orderData.clientUserAgent,
      fbp: orderData.fbp,
      fbc: orderData.fbc,
    };

    // Hash PII fields
    if (orderData.email) {
      userData.em = sha256Hash(orderData.email);
    }
    if (orderData.phone) {
      // Remove all non-digit characters before hashing
      const phoneDigits = orderData.phone.replace(/\D/g, '');
      userData.ph = sha256Hash(phoneDigits);
    }
    if (orderData.firstName) {
      userData.fn = sha256Hash(orderData.firstName);
    }
    if (orderData.lastName) {
      userData.ln = sha256Hash(orderData.lastName);
    }

    // Prepare custom data
    const customData: FacebookEventData['custom_data'] = {
      currency: orderData.currency || 'ILS',
      value: orderData.totalAmount,
    };

    if (orderData.items && orderData.items.length > 0) {
      customData.content_ids = orderData.items.map(item => String(item.productId));
      customData.content_type = 'product';
      customData.contents = orderData.items.map(item => ({
        id: String(item.productId),
        quantity: item.quantity,
        item_price: item.price,
      }));
      customData.num_items = orderData.items.reduce((sum, item) => sum + item.quantity, 0);
    }

    // Create event data
    const eventData: FacebookEventData = {
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000), // Unix timestamp
      event_id: `order_${orderData.orderId}_${Date.now()}`, // Unique event ID for deduplication
      action_source: 'website',
      event_source_url: orderData.eventSourceUrl,
      user_data: userData,
      custom_data: customData,
    };

    // Send to Facebook Conversions API
    const apiUrl = `https://graph.facebook.com/v18.0/${pixelId}/events`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: [eventData],
        access_token: accessToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Facebook Conversions API Error:', errorData);
      return false;
    }

    const result = await response.json();
    console.log('Facebook Conversions API Success:', result);
    return true;
  } catch (error) {
    console.error('Failed to send Facebook Conversions API event:', error);
    return false;
  }
}

/**
 * Send AddToCart event to Facebook Conversions API
 */
export async function sendFacebookAddToCartEvent(
  pixelId: string,
  accessToken: string,
  data: {
    productId: number;
    quantity: number;
    price: number;
    currency?: string;
    eventSourceUrl: string;
    clientIp?: string;
    clientUserAgent?: string;
    fbp?: string;
    fbc?: string;
  }
): Promise<boolean> {
  try {
    const eventData: FacebookEventData = {
      event_name: 'AddToCart',
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_source_url: data.eventSourceUrl,
      user_data: {
        client_ip_address: data.clientIp,
        client_user_agent: data.clientUserAgent,
        fbp: data.fbp,
        fbc: data.fbc,
      },
      custom_data: {
        currency: data.currency || 'ILS',
        value: data.price * data.quantity,
        content_ids: [String(data.productId)],
        content_type: 'product',
        contents: [{
          id: String(data.productId),
          quantity: data.quantity,
          item_price: data.price,
        }],
      },
    };

    const apiUrl = `https://graph.facebook.com/v18.0/${pixelId}/events`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: [eventData],
        access_token: accessToken,
      }),
    });

    if (!response.ok) {
      console.error('Facebook Conversions API Error:', await response.json());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send Facebook AddToCart event:', error);
    return false;
  }
}
