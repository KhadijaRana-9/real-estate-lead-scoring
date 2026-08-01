const NewsletterSubscriber = require('./newsletter.model');

async function subscribe({ email, source }) {
  const subscriber = await NewsletterSubscriber.findOneAndUpdate(
    { email },
    { $set: { status: 'subscribed' }, $setOnInsert: { source: source || 'homepage' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return { email: subscriber.email, status: subscriber.status };
}

async function unsubscribe(token) {
  const subscriber = await NewsletterSubscriber.findOneAndUpdate(
    { unsubscribeToken: token },
    { $set: { status: 'unsubscribed' } },
    { new: true }
  );
  if (!subscriber) {
    const err = new Error('Invalid unsubscribe link');
    err.status = 404;
    throw err;
  }
  return { email: subscriber.email, status: subscriber.status };
}

async function count() {
  return NewsletterSubscriber.countDocuments({ status: 'subscribed' });
}

module.exports = { subscribe, unsubscribe, count };
