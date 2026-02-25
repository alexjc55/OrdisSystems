import { Router } from "express";
import { getDB } from "../../db";
import { storeSettings } from "@shared/schema";

const router = Router();

const getDefaultLanguageFromDB = async (): Promise<string> => {
  try {
    const db = await getDB();
    const storeData = await db.select().from(storeSettings).limit(1);
    return storeData?.[0]?.defaultLanguage || 'ru';
  } catch (error) {
    console.error('Error fetching default language for feeds:', error);
    return 'ru';
  }
};

router.get("/feed/facebook", async (req, res) => {
  try {
    const defaultLang = await getDefaultLanguageFromDB();
    const language = req.query.lang as string || defaultLang;
    const format = req.query.format as string || 'xml';
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const { getFeedProducts, generateFacebookXMLFeed, generateFacebookCSVFeed } = await import('../../feed-generator');
    const products = await getFeedProducts({ language, baseUrl });

    if (format === 'csv') {
      const csvFeed = generateFacebookCSVFeed(products);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=facebook_feed_${language}.csv`);
      res.send(csvFeed);
    } else {
      const xmlFeed = await generateFacebookXMLFeed(products, { language, baseUrl });
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.send(xmlFeed);
    }
  } catch (error) {
    console.error('Error generating Facebook feed:', error);
    res.status(500).json({ message: 'Failed to generate feed' });
  }
});

router.get("/feed/google", async (req, res) => {
  try {
    const defaultLang = await getDefaultLanguageFromDB();
    const language = req.query.lang as string || defaultLang;
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const { getFeedProducts, generateGoogleXMLFeed } = await import('../../feed-generator');
    const products = await getFeedProducts({ language, baseUrl });
    const xmlFeed = await generateGoogleXMLFeed(products, { language, baseUrl });

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(xmlFeed);
  } catch (error) {
    console.error('Error generating Google feed:', error);
    res.status(500).json({ message: 'Failed to generate feed' });
  }
});

router.get("/feed/yandex", async (req, res) => {
  try {
    const defaultLang = await getDefaultLanguageFromDB();
    const language = req.query.lang as string || defaultLang;
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const { getFeedProducts, generateYandexXMLFeed } = await import('../../feed-generator');
    const products = await getFeedProducts({ language, baseUrl });
    const xmlFeed = await generateYandexXMLFeed(products, { language, baseUrl });

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(xmlFeed);
  } catch (error) {
    console.error('Error generating Yandex feed:', error);
    res.status(500).json({ message: 'Failed to generate feed' });
  }
});

router.get("/feed/json", async (req, res) => {
  try {
    const defaultLang = await getDefaultLanguageFromDB();
    const language = req.query.lang as string || defaultLang;
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const { getFeedProducts, generateJSONFeed } = await import('../../feed-generator');
    const products = await getFeedProducts({ language, baseUrl });
    const jsonFeed = await generateJSONFeed(products, { language, baseUrl });

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(jsonFeed);
  } catch (error) {
    console.error('Error generating JSON feed:', error);
    res.status(500).json({ message: 'Failed to generate feed' });
  }
});

export default router;
