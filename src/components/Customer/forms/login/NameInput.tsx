import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import { authService } from '../../../../services/auth.service';
import { toast } from 'react-hot-toast';


const NameInput: React.FC = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [customGender, setCustomGender] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!firstName.trim()) {
      toast.error('Please enter your first name');
      return;
    }
    
    if (!lastName.trim()) {
      toast.error('Please enter your last name');
      return;
    }

    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }
    
    if (!gender) {
      toast.error('Please select your gender');
      return;
    }

    if (gender === 'other' && !customGender.trim()) {
      toast.error('Please specify your gender');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const phoneNumber = localStorage.getItem('phoneNumber');

      if (!token || !phoneNumber) {
        toast.error('Authentication required. Please login again.');
        navigate('/login');
        return;
      }

      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const response = await authService.completeOnboarding({firstName,lastName,email,gender:gender.toUpperCase()});
      
      if (response.success) {
        localStorage.setItem('userName', fullName.trim());
        localStorage.setItem('userGender', gender === 'other' ? customGender : gender);
        localStorage.setItem('userEmail', email.trim());
        localStorage.setItem('needLocation', 'true');
        toast.success('Profile details saved successfully!');
        
        navigate('/location', { 
          state: { 
            fromNameInput: true,
            returnUrl: '/home' 
          } 
        });
      } else {
        throw new Error(response.error || 'Failed to save profile details');
      }

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to save details. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#FFFBEB] px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Welcome to Genda Phool
          </h1>
          <p className="text-gray-600">
            Let's get to know you better
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 space-y-6">
          <div>
            <label className="block text-gray-700 mb-2">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#FF5722] transition-colors"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Enter your email address"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#FF5722] transition-colors"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Valid Input Only"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#FF5722] transition-colors"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-3">Gender</label>
            <div className="flex gap-8">
              {[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' }
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="radio"
                      checked={gender === option.value}
                      onChange={() => setGender(option.value as 'male' | 'female' | 'other')}
                      className="appearance-none w-5 h-5 border-2 border-gray-300 rounded-full checked:border-[#FF5722] transition-colors"
                    />
                    {gender === option.value && (
                      <div className="absolute w-3 h-3 bg-[#FF5722] rounded-full" />
                    )}
                  </div>
                  <span className="text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {gender === 'other' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <label className="block text-gray-700 mb-2">Specify Gender</label>
              <input
                type="text"
                value={customGender}
                onChange={(e) => setCustomGender(e.target.value)}
                placeholder="Enter your gender"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#FF5722] transition-colors"
              />
            </motion.div>
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-3.5 bg-[#FF5722] text-white rounded-full font-medium hover:bg-[#F4511E] transition-colors mt-6"
        >
          {isSubmitting ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mx-auto"
            />
          ) : (
            'Continue'
          )}
        </motion.button>

        {error && (
          <p className="mt-4 text-sm text-red-500 text-center">
            {error}
          </p>
        )}
      </motion.div>
    </div>
  );
};

export default NameInput;
