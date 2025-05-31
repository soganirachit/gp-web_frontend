import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IoCheckmark} from 'react-icons/io5';
import logo from '../../../../assets/All/logo.png';

function Allset() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#FFFBEB] px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Perfect! You're All Set
        </h1>
        
        <p className="text-gray-600 mb-8">
          Let's start your spiritual journey with fresh flowers
        </p>

        <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.2 
            }}
            className="w-16 h-16 bg-[#E8F5E9] rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <IoCheckmark className="text-4xl text-green-500" />
          </motion.div>

          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Profile Created Successfully
          </h2>
          <p className="text-gray-600 mb-6">
            Your account has been created and you're ready to explore our subscription packs!
          </p>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/Products')}
            className="w-full py-3.5 bg-[#FF5722] text-white rounded-full font-medium hover:bg-[#F4511E] transition-colors"
          >
            Browse Subscription Packs
          </motion.button>
        </div>

        <img 
          src={logo} 
          alt="Genda Phool" 
          className="h-12 mx-auto mt-[220px] opacity-50"
        />
      </motion.div>
    </div>
  );
}

export default Allset;