import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { FaArrowLeft, FaMapMarkerAlt } from "react-icons/fa";
import walletImage from "../../assets/icon/Wallet.png";
import { addressService, Address } from "../../services/address.service";
import { IoArrowBack } from "react-icons/io5";
import { MdLocationOn } from "react-icons/md";
import logo from '../../assets/All/logo.png'
import searchImage from '../../assets/icon/Search.png'

const FixedHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // const [userAddress, setUserAddress] = useState<Address | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState<string>("");
  const [isLoadingAddress, setIsLoadingAddress] = useState(true);


  
   const fetchLatestAddress = async () => {
    try {
      setIsLoadingAddress(true);
      const addresses = await addressService.getAllAddresses();
      
      // Sort by updatedAt in descending order and get the most recent address
      const latestAddress = addresses
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        [0];

        if (latestAddress) {
          const formattedAddress = [
            latestAddress.houseNo,
            latestAddress.streetName,
            latestAddress.area,
            latestAddress.city,
            latestAddress.state,
            latestAddress.pincode
          ].filter(Boolean).join(', ');
          
          setDeliveryLocation(formattedAddress);
        } else {
          setDeliveryLocation("");
        }
      } catch (error) {
        console.error("Error fetching address:", error);
        // Fallback to localStorage if API fails
        setDeliveryLocation(localStorage.getItem("userLocation") || "");
      } finally {
        setIsLoadingAddress(false);
      }
    }; 

    useEffect(() => {
      // Only fetch address if we're on the home page
      if (location.pathname === "/home") {
        fetchLatestAddress();
      }
    }, [location.pathname]);


  // Function to get header content based on current route
  const getHeaderContent = () => {
    const path = location.pathname;

    // Auth pages
    if (['/login', '/otp-verification', '/name-input', '/allset'].includes(path)) {
      return (
        <div className="flex items-center">
          <img src={logo} alt="Logo" className="h-16 md:h-20" />
        </div>
      );
    }
    
     // Home page 
     if (path === "/home") {
      return (
        <div className="flex items-center">
          <MdLocationOn className="text-lg text-[#015D3A]" />
          <div className="text-[#64748B] text-sm truncate max-w-xs gap-2">
            {deliveryLocation || "Loading address..."}
          </div>
        </div>
      );
    }

    if (path === "/") {
      return (
        <div className="flex items-center">
         <img src={logo} alt="Logo" className="h-16 md:h-20" />
         
        </div>
      );
    }
    
    // Subscription pages - check for specific subscription routes
    if (path.includes("subscription")) {
      // console.log("Showing subscription content");
      return (
        <div className="flex items-center gap-3">
           <button onClick={() => navigate(-1)} 
          className="hover:bg-gray-100 rounded-full p-2 transition-colors"
          >
            <IoArrowBack className="text-xl md:text-2xl" />
          </button>
          <h1 className="text-xl md:text-2xl font-medium">
            Manage Subscription
          </h1>
        </div>
      );
    }

    if (path.includes("address-selection")) {
      // console.log("Showing subscription content");
      return (
        <div className="flex items-center gap-3">
           <button onClick={() => navigate(-1)} 
          className="hover:bg-gray-100 rounded-full p-2 transition-colors"
          >
            <IoArrowBack className="text-xl md:text-2xl" />
          </button>
          <h1 className="text-xl md:text-2xl font-medium">
            Select Delivery Address
          </h1>
        </div>
      );
    }
    
    // Addresses page
    if (path.includes("addresses")) {
      return (
        <div className="flex items-center gap-3">
           <button onClick={() => navigate(-1)} 
          className="hover:bg-gray-100 rounded-full p-2 transition-colors"
          >
            <IoArrowBack className="text-xl md:text-2xl" />
          </button>
          <h1 className="text-xl md:text-2xl font-medium">
            Address Book
          </h1>
        </div>
      );
    }
    
    // Store pages - check for specific store routes
    if (path.includes("manage-my-storeProducts")) {
      // console.log("Showing store content");
      return (
        <div className="flex items-center gap-3">
           <button onClick={() => navigate(-1)} 
          className="hover:bg-gray-100 rounded-full p-2 transition-colors"
          >
            <IoArrowBack className="text-xl md:text-2xl" />
          </button>
          <h1 className="text-xl md:text-2xl font-medium">
            My Store Products
          </h1>
        </div>
      );
    }
    
    if (path.includes("store") || path.includes("store-products")) {
      // console.log("Showing store content");
      return (
        <div className="flex items-center gap-3">
           <button onClick={() => navigate(-1)} 
          className="hover:bg-gray-100 rounded-full p-2 transition-colors"
          >
            <IoArrowBack className="text-xl md:text-2xl" />
          </button>
          <h1 className="text-xl md:text-2xl font-medium">
            Store Products
          </h1>
        </div>
      );
    }

    if (path.includes("product")) {
      // console.log("Showing store content");
      return (
        <div className="flex items-center gap-3">
           <button onClick={() => navigate(-1)} 
          className="hover:bg-gray-100 rounded-full p-2 transition-colors"
          >
            <IoArrowBack className="text-xl md:text-2xl" />
          </button>
          <h1 className="text-xl md:text-2xl font-medium">
            Puja Packs
          </h1>
        </div>
      );
    }
    
    // Support pages - check for specific support routes
    if (path.includes("support") || path.includes("customer-support")) {
      // console.log("Showing support content");
      return (
        <div className="flex items-center gap-3">
           <button onClick={() => navigate(-1)} 
          className="hover:bg-gray-100 rounded-full p-2 transition-colors"
          >
            <IoArrowBack className="text-xl md:text-2xl" />
          </button>
          <h1 className="text-xl md:text-2xl font-medium">
            Request & Support
          </h1>
        </div>
      );
    }
    
    // Account pages - check for specific account routes
    if (path.includes("account") || path.includes("profile") || path.includes("settings")) {
      // console.log("Showing account content");
      return (
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} 
          className="hover:bg-gray-100 rounded-full p-2 transition-colors"
          >
            <IoArrowBack className="text-xl md:text-2xl" />
          </button>
          <h1 className="text-xl md:text-2xl font-medium">
            Account & Settings
          </h1>
        </div>
      );
    }
    
    // Wallet page
    if (path.includes("wallet")) {
      // console.log("Showing wallet content");
      return (
        <div className="flex items-center gap-3">
           <button onClick={() => navigate(-1)} 
          className="hover:bg-gray-100 rounded-full p-2 transition-colors"
          >
            <IoArrowBack className="text-xl md:text-2xl" />
          </button>
          <h1 className="text-xl md:text-2xl font-medium">
            Wallet
          </h1>
        </div>
      );
    }
    
    // Orders page
    if (path.includes("orders")) {
      // console.log("Showing orders content");
      return (
        <div className="flex items-center gap-3">
           <button onClick={() => navigate(-1)} 
          className="hover:bg-gray-100 rounded-full p-2 transition-colors"
          >
            <IoArrowBack className="text-xl md:text-2xl" />
          </button>
          <h1 className="text-xl md:text-2xl font-medium">
            Orders
          </h1>
        </div>
      );
    }
    
    // Refer page
    if (path.includes("refer")) {
      // console.log("Showing refer content");
      return (
        <div className="flex items-center gap-3">
           <button onClick={() => navigate(-1)} 
          className="hover:bg-gray-100 rounded-full p-2 transition-colors"
          >
            <IoArrowBack className="text-xl md:text-2xl" />
          </button>
          <h1 className="text-xl md:text-2xl font-medium">
            Refer & Earn
          </h1>
        </div>
      );
    }
    
    // Default fallback - only for truly unknown routes
    // console.log("Showing default fallback content");
    return (
      <div className="flex items-center gap-3">
         <button onClick={() => navigate(-1)} 
          className="hover:bg-gray-100 rounded-full p-2 transition-colors"
          >
            <IoArrowBack className="text-xl md:text-2xl" />
          </button>
        <h1 className="text-xl md:text-2xl font-medium">Back</h1>
      </div>
    );
  };

  return (
    <div className="bg-[#FFFBEB] sticky top-0 z-10">
      <div className={`max-w-[800px] mx-auto px-4 ${
      ['/login', '/otp-verification', '/name-input', '/allset'].includes(location.pathname) 
        ? 'py-2' 
        : 'py-3'
    }`}>
        <div className="flex items-center justify-between">
          {/* Left side - Dynamic content */}
          {getHeaderContent()}
          
          {/* Right side - Fixed wallet icon */}
          <div className="flex items-center gap-4">
             {/* Add search icon here for home page */}
          {location.pathname === "/" && (
            <img 
              src={searchImage} 
              alt="search" 
              className="w-6 h-6 sm:w-8 sm:h-8 md:w-8 md:h-8 cursor-pointer" 
              onClick={() => navigate('/search')}
            />
          )}
          <img
                  src={walletImage}
                  alt="Wallet"
                  className="w-10 h-10 md:w-10 md:h-10"
                  onClick={() => navigate("/wallet")}
                />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FixedHeader;