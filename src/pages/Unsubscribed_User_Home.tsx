import { useState, useEffect, useRef } from 'react';
import { FaStar, FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import logo from '../assets/All/logo.png'
import Banner1 from '../assets/Banner/Banner1.png'
import Banner2 from '../assets/Banner/Banner1.png'
import Banner3 from '../assets/Banner/Banner1.png'
const StoryImage = '/story.png';
import { useNavigate } from 'react-router-dom';
import { productService } from '../services/product.service';
import Delivered from '../assets/icon/Frame.png'
import Emplooyes from '../assets/icon/Employees.png'
import Truck from '../assets/icon/Truck.png'
import searchImage from '../assets/icon/Search.png'
import Eco from '../assets/icon/Eco.png'
import wallet from '../assets/icon/Wallet.png'
import Profile from '../assets/icon/Profile.png'
import BottomNav from '../components/layout/BottomNav';
import Spinner from '../components/common/Spinner';


interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  sellingPrice: number;
  type?: string;
  allowedSubscriptionType: string;
  tags: string[];
  weight?: number;
  isAvailable: boolean;
}

function Unsubscribed_User_Home() {
  const navigate = useNavigate();
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const sliderRef = useRef<Slider | null>(null);

  const handleProductClick = (item: Product) => {
    navigate(`/product/${item.id}`);
  };

  const handlePageClick = () => {
    navigate('/home');
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoadingProducts(true);
        const data = await productService.getAllProducts();
        setProducts(data as Product[]);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  const sliderSettings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1
  };

  if (isLoadingProducts) {
    return (
      <div className="min-h-screen bg-[#f8f6f1] flex items-center justify-center">
        <Spinner size={400} />
      </div>
    );
  }

  return (
    <div className="bg-[#f8f6f1] min-h-screen cursor-pointer" onClick={handlePageClick}>
      <div className="max-w-[800px] mx-auto">
        {/* Header */}
        {/* <div className="flex items-center justify-between p-4 md:p-6">
          <img src={logo} alt="Logo" className="h-16 md:h-20" />
          <div className="flex items-center gap-4 md:gap-6">
          <img 
              src={searchImage} 
              alt="search" 
              className="w-6 h-6 sm:w-8 sm:h-8 md:w-8 md:h-8 mb-1 sm:mb-4 md:mb-4" 
              onClick={() => navigate('/search')}
            />
            <button onClick={() => navigate('/wallet')} className="w-12 h-12 mb-2 md:w-14 md:h-14">
              <img src={wallet} alt="Wallet" className="w-full h-full" />
            </button>
            <button onClick={() => navigate('/Account')} className="w-8 h-8 mb-2 md:w-10 md:h-10">
              <img src={Profile} alt="Profile" className="w-full h-full" />
            </button>
          </div>
        </div> */}

        {/* Slider Gallery */}
        <div className="px-4 md:px-6">
          <Slider {...sliderSettings}>
            <img src={Banner1} alt='Banner' className='w-full rounded-xl' />
            <img src={Banner2} alt='Banner' className='w-full rounded-xl' />
            <img src={Banner3} alt='Banner' className='w-full rounded-xl' />
          </Slider>
        </div>

        {/* Metrics Section */}
        <div className="grid grid-cols-2 gap-4 px-4 mt-7 md:px-6 md:gap-6">
          <div className="text-center bg-white p-4 md:p-6 rounded-lg shadow-md flex flex-col items-center">
            <img src={Delivered} className="w-8 h-8 mb-2 md:w-10 md:h-10" />
            <h2 className="text-xl md:text-2xl font-semibold">100,000+</h2>
            <p className="text-sm md:text-base">Orders Delivered</p>
          </div>
          <div className="text-center bg-white p-4 md:p-6 rounded-lg shadow-md flex flex-col items-center">
            <img src={Emplooyes} className="w-8 h-8 mb-2 md:w-10 md:h-10" />
            <h2 className="text-xl md:text-2xl font-semibold">40%</h2>
            <p className="text-sm md:text-base">Women Employees</p>
          </div>
          <div className="text-center bg-white p-4 md:p-6 rounded-lg shadow-md flex flex-col items-center">
            <img src={Eco} className="w-8 h-8 mb-2 md:w-10 md:h-10" />
            <h2 className="text-xl md:text-2xl font-semibold">100%</h2>
            <p className="text-sm md:text-base">Eco-Friendly Packaging</p>
          </div>
          <div className="text-center bg-white p-4 md:p-6 rounded-lg shadow-md flex flex-col items-center">
            <img src={Truck} className="w-8 h-8 mb-2 md:w-10 md:h-10" />
            <h2 className="text-xl md:text-2xl font-semibold">5:00 AM</h2>
            <p className="text-sm md:text-base">Freshly Plucked and Delivered!</p>
          </div>
        </div>

        {/* Testimonials Slider */}
        <div className="px-4 mt-8 md:px-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-semibold">We're Loved!</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={() => sliderRef?.current?.slickPrev()}
                className="bg-[#F3F4F6] text-black rounded-full h-8 w-8 md:h-10 md:w-10 flex items-center justify-center hover:bg-gray-200 transition-colors active:bg-gray-300"
              >
                <FaArrowLeft className="text-sm md:text-base" />
              </button>
              <button
                onClick={() => sliderRef?.current?.slickNext()}
                className="bg-[#F3F4F6] text-black rounded-full h-8 w-8 md:h-10 md:w-10 flex items-center justify-center hover:bg-gray-200 transition-colors active:bg-gray-300"
              >
                <FaArrowRight className="text-sm md:text-base" />
              </button>
            </div>
          </div>

          <Slider ref={sliderRef} {...sliderSettings} dots={false} arrows={false}
            slidesToShow={window.innerWidth >= 768 ? 2 : 1.2}
            infinite={false}
            responsive={[
              {
                breakpoint: 768,
                settings: {
                  slidesToShow: 1.2,
                  slidesToScroll: 1
                }
              }
            ]}>
            <div className="pr-4 mb-4">
              <div className="bg-white p-6 rounded-2xl shadow-md h-[200px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-8 mb-1">
                    <h3 className="text-lg font-medium">Rajesh Kumar</h3>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <FaStar key={i} className="text-yellow-400 text-sm" />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm mb-3">2 days ago</p>
                  <p className="text-gray-700 line-clamp-3">
                    "Fresh flowers every morning have transformed my daily puja ritual. Excellent service!"
                  </p>
                </div>
              </div>
            </div>

            <div className="pr-4">
              <div className="bg-white p-6 rounded-2xl shadow-md h-[200px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-medium">Priya Sharma</h3>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <FaStar key={i} className="text-yellow-400 text-sm" />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm mb-3">1 week ago</p>
                  <p className="text-gray-700 line-clamp-3">
                    "Never had to worry about getting flowers again. The quality is consistently great."
                  </p>
                </div>
              </div>
            </div>

            <div className="pr-4">
              <div className="bg-white p-6 rounded-2xl shadow-md h-[200px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-medium">Amit Patel</h3>
                    <div className="flex">
                      {[...Array(3)].map((_, i) => (
                        <FaStar key={i} className="text-yellow-400 text-sm" />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm mb-3">2 weeks ago</p>
                  <p className="text-gray-700 line-clamp-3">
                    "Very convenient service. The flowers are always fresh and delivered on time."
                  </p>
                </div>
              </div>
            </div>

            <div className="pr-4">
              <div className="bg-white p-6 rounded-2xl shadow-md h-[200px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-medium">Meera Singh</h3>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <FaStar key={i} className="text-yellow-400 text-sm" />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm mb-3">3 weeks ago</p>
                  <p className="text-gray-700 line-clamp-3">
                    "Best flower delivery service in Kolkata! The garlands are beautifully made."
                  </p>
                </div>
              </div>
            </div>
          </Slider>
        </div>

        {/* How It Works */}
        <div className="px-4 mt-8 md:px-6">
          <h2 className="text-3xl md:text-2xl font-medium mb-4">How It Works</h2>
          <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
            <ul className="space-y-4 md:space-y-6">
              <li className="flex items-start">
                <span className="bg-orange-100 text-orange-600 rounded-full h-8 w-8 flex items-center justify-center mr-4">1</span>
                <div>
                  <h3 className="font-medium mb-1 md:mb-2">Choose your pack</h3>
                  <p className="text-sm">Select from our curated flower packs</p>
                </div>
              </li>
              <li className="flex items-start">
                <span className="bg-orange-100 text-orange-600 rounded-full h-8 w-8 flex items-center justify-center mr-4">2</span>
                <div>
                  <h3 className="font-medium mb-1 md:mb-2">Pick delivery days</h3>
                  <p className="text-sm">Choose daily or customize your delivery days</p>
                </div>
              </li>
              <li className="flex items-start">
                <span className="bg-orange-100 text-orange-600 rounded-full h-8 w-8 flex items-center justify-center mr-4">3</span>
                <div>
                  <h3 className="font-medium mb-1 md:mb-2">Enjoy fresh flowers</h3>
                  <p className="text-sm">Get fresh flowers delivered before 7 AM</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Our Story */}
        <div className="px-4 mt-8 md:px-6">
          <h2 className=" text-[28px] font-[400] mb-4 leading-[65.53px]">Our Story</h2>
          <div className="p-4 rounded-lg overflow-hidden max-w-sm mx-auto md:max-w-2xl">
            <img src={StoryImage} alt="Our Story" className="w-full rounded-t-lg" />
            <p className="font-['Inter'] text-[16px] font-[400] leading-[30.53px] bg-white rounded-b-lg p-4 md:p-6">
              Once upon a time, amidst the bustling streets of our beloved city, a group of passionate flower enthusiasts came together to create GendaPhool. Our mission was simple: to bring the freshest, most beautiful flowers to your doorstep every day. With a commitment to sustainability and a love for nature, we have grown into a community of flower lovers who believe in the power of blooms to brighten any day.
            </p>
          </div>
        </div>

        {/* Products Sections */}
        <div className="px-4 md:px-6">
          {/* Flowers Section */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-800">Flowers</h2>
              <button className="text-green-600 text-sm md:text-base font-medium" onClick={() => navigate('/products?category=flowers')}>
                View All
              </button>
            </div>
            {products.filter(item => item.type === 'FLOWERS').length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No flowers available at the moment
              </div>
            ) : (
              <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4">
                {products
                  .filter(item => item.type === 'FLOWERS' && item.isAvailable)
                  .map(item => (
                    <div
                      key={item.id}
                      className="flex-shrink-0 w-[160px] md:w-[200px] h-[280px] md:h-[320px] bg-white rounded-3xl shadow-sm overflow-hidden cursor-pointer"
                      onClick={() => handleProductClick(item)}
                    >
                      <div className="p-3">
                        <div className="bg-[#f8f6f1] rounded-2xl overflow-hidden aspect-square">
                          <img
                            src={item.imageUrl || '/placeholder.svg'}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="pt-3 pb-2 px-1 space-y-2">
                          <h3 className="text-[16px] font-semibold text-gray-900 truncate">{item.name}</h3>
                          <p className="text-[14px] text-gray-500 truncate">{item.description}</p>
                          <p className="text-pink-600 text-[16px] font-bold">₹{item.sellingPrice}</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProductClick(item);
                            }}
                            className="text-green-600 text-[16px] mb-3 font-medium block"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Leaves Section */}
          <div className="mt-8 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-800">Leaves</h2>
              <button className="text-green-600 text-sm md:text-base font-medium" onClick={() => navigate('/products?category=leaves')}>
                View All
              </button>
            </div>
            {products.filter(item => item.type === 'LEAVES').length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No leaves available at the moment
              </div>
            ) : (
              <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4">
                {products
                  .filter(item => item.type === 'LEAVES' && item.isAvailable)
                  .map(item => (
                    <div
                      key={item.id}
                      className="flex-shrink-0 w-[160px] md:w-[200px] h-[280px] md:h-[320px] bg-white rounded-3xl shadow-sm overflow-hidden cursor-pointer"
                      onClick={() => handleProductClick(item)}
                    >
                      <div className="p-3">
                        <div className="bg-[#f8f6f1] rounded-2xl overflow-hidden aspect-square">
                          <img
                            src={item.imageUrl || '/placeholder.svg'}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="pt-3 pb-2 px-1 space-y-2">
                          <h3 className="text-[16px] font-semibold text-gray-900 truncate">{item.name}</h3>
                          <p className="text-[14px] text-gray-500 truncate">{item.description}</p>
                          <p className="text-pink-600 text-[16px] font-bold">₹{item.sellingPrice}</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProductClick(item);
                            }}
                            className="text-green-600 text-[16px] mb-3 font-medium block"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Motivational Quote */}
        <div className="px-4 mt-8 md:px-6">
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-md">
            <h1 className='text-[#92400E] md:text-lg'>Today's FLower Wisdom</h1>
            <p className="italic text-center md:text-lg">"Like the lotus flower that grows out of the mud, and blossoms above the muddy water's surface, we too can rise above our defilements."</p>
            <p className="text-right mt-2 md:text-lg">— Buddhist Teaching</p>
          </div>
        </div>

        {/* Logo */}
        <div className='mt-[290px] mb-9 flex mr-[120px] justify-center'>
          <img src={logo} alt='' className='text-[#231F20] opacity-50 md:h-24' />
        </div>
      </div>

      {/* Navigation Bar - Hide on desktop */}
      <div className='fixed overflow:hidden md:hidden'>
        <BottomNav />
      </div>

    </div>
  );
}

export default Unsubscribed_User_Home;