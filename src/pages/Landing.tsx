import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MdQrCode, MdShoppingBasket, MdAdminPanelSettings, MdDeliveryDining, MdEventNote, MdCamera } from 'react-icons/md';
import { FaLeaf, FaStar, FaTruck, FaGift } from 'react-icons/fa';
import { SEO } from '../components/SEO';
import { trackPageView } from '../lib/metaPixel';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    trackPageView();
  }, []);

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  // Services data
  const services = [
    {
      icon: FaLeaf,
      title: 'Daily Puja Flowers',
      description: 'Fresh marigolds, roses, & tulips for your daily puja.',
    },
    {
      icon: FaGift,
      title: 'Bouquets & Exotic',
      description: 'Stunning bouquets with fresh blooms for gifting & celebrations.',
    },
    {
      icon: FaTruck,
      title: 'Sajawat',
      description: 'Elegant design & planning for weddings & special events.',
    },
    {
      icon: MdEventNote,
      title: 'Festival Collections',
      description: 'Special packs for Diwali, Ganesh Chaturthi, Holi & festivals.',
    },
  ];

  // How BloomBar works steps
  const steps = [
    { number: '1', title: 'Scan QR', description: 'Point your camera at the flower bag.' },
    { number: '2', title: 'Choose Quantity', description: 'Pick how many you want.' },
    { number: '3', title: 'Add to Basket', description: 'Proceed to checkout.' },
    { number: '4', title: 'Pay Securely', description: 'Multiple payment methods accepted.' },
  ];

  // Testimonials
  const testimonials = [
    {
      name: 'Priya S.',
      text: 'The freshest flowers I have received delivered on time every morning for puja.',
      stars: 5,
    },
    {
      name: 'Rahul M.',
      text: 'Genda Phool used our wedding decoration absolutely stunning. Highly recommended!',
      stars: 5,
    },
    {
      name: 'Anjali K.',
      text: 'Subscribed to the daily puja flowers — it\'s so convenient and always fresh!',
      stars: 5,
    },
  ];

  // Stats
  const stats = [
    { value: '50,000+', label: 'Happy Customers' },
    { value: '100+', label: 'Cities Served' },
    { value: '167 Days', label: 'Fastest Delivery' },
    { value: '4.8 ⭐', label: 'Average Rating' },
  ];

  return (
    <>
      <SEO
        title="BloomBar - Premium Flowers, Instantly | Genda Phool"
        description="Scan QR, get fresh flowers instantly. Daily puja flowers, bouquets, weddings & festivals."
        canonical="https://mygendaphool.com/landing"
      />
      <motion.div
        className="min-h-screen bg-gradient-to-b from-green-50 to-white"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Hero Section */}
        <motion.section
          className="relative px-4 pt-8 pb-12 sm:pt-12 sm:pb-16 md:pt-16 md:pb-20 bg-gradient-to-b from-green-600 to-green-500 text-white"
          variants={itemVariants}
        >
          <div className="max-w-4xl mx-auto text-center">
            <motion.div variants={itemVariants} className="mb-4 flex justify-center">
              <div className="inline-flex items-center gap-2 bg-white bg-opacity-20 px-4 py-2 rounded-full">
                <FaLeaf className="text-lg" />
                <span className="text-sm font-medium">BloomBar by Genda Phool</span>
              </div>
            </motion.div>
            <motion.h1 variants={itemVariants} className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
              Premium Flowers,<br />Instantly.
            </motion.h1>
            <motion.p variants={itemVariants} className="text-lg sm:text-xl mb-8 text-green-50 max-w-2xl mx-auto">
              Scan any flower QR at our kiosks to add fresh blooms to your basket.
            </motion.p>
            <motion.button
              variants={itemVariants}
              onClick={() => handleNavigate('/gp-daily')}
              className="bg-white text-green-600 px-8 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-all shadow-lg inline-flex items-center gap-2"
            >
              <MdCamera className="text-xl" />
              Scan Flower Now
            </motion.button>
          </div>
        </motion.section>

        {/* Quick Actions */}
        <motion.section className="px-4 py-12 sm:py-16 max-w-4xl mx-auto" variants={containerVariants}>
          <motion.h2 variants={itemVariants} className="text-2xl sm:text-3xl font-bold mb-6 text-center text-gray-800">
            Quick Actions
          </motion.h2>
          <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: MdQrCode, title: 'Scan a Flower QR', desc: 'Opens camera scanner instantly' },
              { icon: MdShoppingBasket, title: 'My Basket', desc: 'View and manage your items' },
              { icon: MdAdminPanelSettings, title: 'Admin Dashboard', desc: 'Kiosks & analytics' },
            ].map((action, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-green-100"
              >
                <action.icon className="text-4xl text-green-600 mb-3" />
                <h3 className="font-semibold text-gray-800 mb-1">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* About Genda Phool */}
        <motion.section className="px-4 py-12 sm:py-16 bg-green-50 max-w-4xl mx-auto w-full" variants={containerVariants}>
          <motion.div variants={itemVariants} className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">About Genda Phool</h2>
            <p className="text-gray-600">India's leading flower e-commerce brand</p>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-white p-8 rounded-xl shadow-md mb-8">
            <p className="text-gray-700 leading-relaxed mb-4">
              Genda Phool is India's leading flower e-commerce platform — connecting flower farmers directly to customers, 
              ensuring freshness and fair pricing while bypassing middlemen. We cater to daily puja flowers, gifting, weddings, 
              and events.
            </p>
          </motion.div>

          <motion.div variants={containerVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.map((stat, idx) => (
              <motion.div key={idx} variants={itemVariants} className="bg-white p-4 rounded-lg text-center shadow-sm">
                <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">{stat.value}</div>
                <div className="text-xs sm:text-sm text-gray-600">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* Services */}
        <motion.section className="px-4 py-12 sm:py-16 max-w-4xl mx-auto" variants={containerVariants}>
          <motion.h2 variants={itemVariants} className="text-2xl sm:text-3xl font-bold mb-8 text-center text-gray-800">
            Our Services
          </motion.h2>
          <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {services.map((service, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all border border-green-100"
              >
                <service.icon className="text-4xl text-green-600 mb-3" />
                <h3 className="font-bold text-lg text-gray-800 mb-2">{service.title}</h3>
                <p className="text-gray-600 text-sm">{service.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* How BloomBar Works */}
        <motion.section className="px-4 py-12 sm:py-16 bg-green-50 max-w-4xl mx-auto w-full" variants={containerVariants}>
          <motion.h2 variants={itemVariants} className="text-2xl sm:text-3xl font-bold mb-12 text-center text-gray-800">
            How BloomBar Works
          </motion.h2>
          <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-2">
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="relative flex flex-col items-center"
              >
                <div className="w-16 h-16 rounded-full bg-green-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg mb-4">
                  {step.number}
                </div>
                <h3 className="font-bold text-gray-800 text-center mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600 text-center">{step.description}</p>
                {idx < steps.length - 1 && (
                  <div className="hidden sm:block absolute top-8 -right-2 text-green-300 text-2xl">→</div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* Customer Testimonials */}
        <motion.section className="px-4 py-12 sm:py-16 max-w-4xl mx-auto" variants={containerVariants}>
          <motion.h2 variants={itemVariants} className="text-2xl sm:text-3xl font-bold mb-8 text-center text-gray-800">
            What Customers Say
          </motion.h2>
          <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {testimonials.map((testimonial, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500"
              >
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(testimonial.stars)].map((_, i) => (
                    <FaStar key={i} className="text-yellow-400 text-sm" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm mb-4 italic">"{testimonial.text}"</p>
                <p className="font-semibold text-gray-800">— {testimonial.name}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* App Download CTA */}
        <motion.section
          className="px-4 py-12 sm:py-16 bg-green-600 text-white max-w-4xl mx-auto w-full rounded-2xl mx-auto mb-16"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants} className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Get the Genda Phool App</h2>
            <p className="text-green-50 mb-8 max-w-md mx-auto">
              Manage subscriptions, orders & more on the go.
            </p>
            <motion.div variants={containerVariants} className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                variants={itemVariants}
                className="bg-white text-green-600 px-8 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <span>🔗</span> Google Play
              </motion.button>
              <motion.button
                variants={itemVariants}
                className="bg-white text-green-600 px-8 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <span>🔗</span> App Store
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.section>

        {/* Footer CTA */}
        <motion.section className="px-4 py-8 text-center text-gray-600" variants={containerVariants}>
          <motion.button
            variants={itemVariants}
            onClick={() => handleNavigate('/gp-daily')}
            className="bg-green-600 text-white px-12 py-3 rounded-lg font-semibold hover:bg-green-700 transition-all mb-4"
          >
            Start Shopping Now
          </motion.button>
          <motion.div variants={containerVariants} className="flex gap-4 justify-center text-sm">
            <motion.a
              variants={itemVariants}
              href="/privacy"
              className="hover:text-green-600 transition-colors"
            >
              Privacy
            </motion.a>
            <motion.a
              variants={itemVariants}
              href="/terms"
              className="hover:text-green-600 transition-colors"
            >
              Terms
            </motion.a>
          </motion.div>
        </motion.section>
      </motion.div>
    </>
  );
};

export default Landing;
