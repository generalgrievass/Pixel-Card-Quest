import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// MapleStory-inspired components
const PixelButton = ({ children, onClick, variant = "primary", disabled = false }) => {
  const baseClasses = "pixel-button text-white font-bold py-2 px-4 border-2 border-solid transition-all duration-100 cursor-pointer select-none";
  const variantClasses = {
    primary: "bg-blue-600 border-blue-800 hover:bg-blue-500 active:bg-blue-700",
    success: "bg-green-600 border-green-800 hover:bg-green-500 active:bg-green-700",
    danger: "bg-red-600 border-red-800 hover:bg-red-500 active:bg-red-700",
    secondary: "bg-gray-600 border-gray-800 hover:bg-gray-500 active:bg-gray-700"
  };
  
  return (
    <button 
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

const PixelCard = ({ card, onLike, onDislike, isVisible = true }) => {
  if (!isVisible) return null;
  
  return (
    <div className="pixel-card bg-gradient-to-b from-yellow-200 to-yellow-300 border-4 border-yellow-600 rounded-lg p-4 shadow-lg max-w-sm mx-auto">
      <div className="card-header bg-yellow-600 text-white px-3 py-1 mb-3 text-center font-bold border-2 border-yellow-800">
        Pixel Card #{card.id.slice(-6)}
      </div>
      
      <div className="card-image-container bg-white border-2 border-gray-400 p-2 mb-4">
        <img 
          src={`data:image/png;base64,${card.image_base64}`}
          alt="Pixel Art"
          className="w-full h-48 object-contain pixel-art"
        />
      </div>
      
      <div className="card-actions flex justify-center space-x-4">
        <PixelButton variant="danger" onClick={onDislike}>
          💔 Pass
        </PixelButton>
        <PixelButton variant="success" onClick={onLike}>
          💖 Like
        </PixelButton>
      </div>
    </div>
  );
};

const CollectionGallery = ({ collection, onBack }) => {
  const [zoomedCard, setZoomedCard] = useState(null);

  const handleCardClick = (card) => {
    setZoomedCard(card);
  };

  const closeZoom = () => {
    setZoomedCard(null);
  };

  return (
    <div className="collection-view min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-white pixel-text">My Collection</h1>
          <PixelButton variant="secondary" onClick={onBack}>
            🏠 Back to Cards
          </PixelButton>
        </div>
        
        {collection.length === 0 ? (
          <div className="text-center text-white text-xl">
            <p>No cards in your collection yet!</p>
            <p className="text-gray-300 mt-2">Like some cards to add them here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {collection.map((card, index) => (
              <div 
                key={card.id} 
                className="collection-card bg-gradient-to-b from-pink-200 to-pink-300 border-4 border-pink-600 rounded-lg p-4 shadow-lg cursor-pointer transform transition-transform hover:scale-105"
                onClick={() => handleCardClick(card)}
              >
                <div className="card-header bg-pink-600 text-white px-3 py-1 mb-3 text-center font-bold border-2 border-pink-800">
                  Collected #{index + 1}
                </div>
                <div className="card-image-container bg-white border-2 border-gray-400 p-2">
                  <img 
                    src={`data:image/png;base64,${card.image_base64}`}
                    alt="Pixel Art"
                    className="w-full h-32 object-contain pixel-art"
                  />
                </div>
                <div className="mt-2 text-center">
                  <span className="text-pink-800 text-sm font-semibold">💖 Liked</span>
                </div>
                <div className="mt-1 text-center">
                  <span className="text-pink-600 text-xs">Click to zoom</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Zoom Modal */}
      {zoomedCard && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={closeZoom}
        >
          <div className="max-w-4xl max-h-full bg-gradient-to-b from-pink-200 to-pink-300 border-4 border-pink-600 rounded-lg p-6 shadow-2xl relative">
            <button 
              className="absolute top-2 right-2 text-pink-800 hover:text-pink-900 text-2xl font-bold"
              onClick={closeZoom}
            >
              ✕
            </button>
            
            <div className="card-header bg-pink-600 text-white px-4 py-2 mb-4 text-center font-bold border-2 border-pink-800 rounded">
              Zoomed View - {zoomedCard.prompt}
            </div>
            
            <div className="card-image-container bg-white border-2 border-gray-400 p-4 rounded">
              <img 
                src={`data:image/png;base64,${zoomedCard.image_base64}`}
                alt="Pixel Art Zoomed"
                className="w-full max-w-2xl h-auto object-contain pixel-art mx-auto"
              />
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-pink-800 text-sm mb-2">
                <strong>Created:</strong> {new Date(zoomedCard.created_at).toLocaleDateString()}
              </p>
              <div className="flex justify-center space-x-4">
                <span className="text-pink-800 font-semibold">💖 In Your Collection</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const GameUI = () => {
  const [currentCard, setCurrentCard] = useState(null);
  const [nextCard, setNextCard] = useState(null);
  const [collection, setCollection] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [showCollection, setShowCollection] = useState(false);
  const [cardQueue, setCardQueue] = useState([]);
  const [stats, setStats] = useState({ total: 0, liked: 0 });

  // Fetch existing cards first, then generate new ones
  const fetchCards = async () => {
    try {
      const response = await axios.get(`${API}/cards`);
      return response.data;
    } catch (error) {
      console.error('Error fetching cards:', error);
      return [];
    }
  };

  // Generate a new card
  const generateNewCard = async () => {
    try {
      const response = await axios.post(`${API}/generate-card`);
      return response.data;
    } catch (error) {
      console.error('Error generating card:', error);
      return null;
    }
  };

  // Load initial cards
  const loadInitialCards = async () => {
    setIsLoading(true);
    try {
      console.log('Starting to load initial cards...');
      
      // First try to get existing cards
      let cards = await fetchCards();
      console.log('Fetched cards:', cards.length);
      
      // Filter out already liked cards
      const availableCards = cards.filter(card => !card.is_liked);
      console.log('Available cards (not liked):', availableCards.length);
      
      if (availableCards.length === 0) {
        // If no available cards, generate a new one
        console.log('No available cards, generating new one...');
        const newCard = await generateNewCard();
        if (newCard) {
          availableCards.push(newCard);
          console.log('Generated new card:', newCard.id);
        } else {
          console.error('Failed to generate new card');
          setIsLoading(false);
          return;
        }
      }
      
      // Set up the card queue
      if (availableCards.length > 0) {
        setCurrentCard(availableCards[0]);
        setCardQueue(availableCards.slice(1));
        console.log('Set current card:', availableCards[0].id);
        
        // Load next card
        if (availableCards.length > 1) {
          setNextCard(availableCards[1]);
          console.log('Set next card from queue:', availableCards[1].id);
        } else {
          console.log('Generating next card...');
          const newCard = await generateNewCard();
          if (newCard) {
            setNextCard(newCard);
            console.log('Generated next card:', newCard.id);
          }
        }
      } else {
        console.error('No cards available and failed to generate any');
      }
      
    } catch (error) {
      console.error('Error loading initial cards:', error);
    } finally {
      console.log('Finished loading cards, setting loading to false');
      setIsLoading(false);
    }
  };

  // Load user collection
  const loadCollection = async () => {
    try {
      const response = await axios.get(`${API}/collection`);
      setCollection(response.data);
    } catch (error) {
      console.error('Error loading collection:', error);
    }
  };

  // Handle card actions
  const handleCardAction = async (liked) => {
    if (!currentCard) return;
    
    try {
      await axios.post(`${API}/like-card`, {
        card_id: currentCard.id,
        liked: liked
      });
      
      // Update stats
      setStats(prev => ({
        total: prev.total + 1,
        liked: liked ? prev.liked + 1 : prev.liked
      }));
      
      // Move to next card
      const nextCardInQueue = cardQueue[0] || nextCard;
      setCurrentCard(nextCardInQueue);
      
      // Update card queue
      if (cardQueue.length > 0) {
        setCardQueue(prev => prev.slice(1));
      }
      
      // Prepare next card
      if (cardQueue.length <= 1) {
        const newCard = await generateNewCard();
        setNextCard(newCard);
      } else {
        setNextCard(cardQueue[1]);
      }
      
      // Reload collection if card was liked
      if (liked) {
        await loadCollection();
      }
      
    } catch (error) {
      console.error('Error handling card action:', error);
    }
  };

  // Initialize app
  useEffect(() => {
    loadInitialCards();
    loadCollection();
    
    // Add a fallback timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (isLoading) {
        console.warn('Loading timeout reached, forcing loading to stop');
        setIsLoading(false);
      }
    }, 30000); // 30 second timeout
    
    return () => clearTimeout(loadingTimeout);
  }, []);

  if (showCollection) {
    return <CollectionGallery collection={collection} onBack={() => setShowCollection(false)} />;
  }

  return (
    <div className="game-container min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      {/* Pixel stars background */}
      <div className="absolute inset-0 pixel-stars"></div>
      
      {/* Game UI Header */}
      <div className="relative z-10 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="game-header bg-gradient-to-r from-yellow-400 to-orange-400 border-4 border-yellow-600 rounded-lg p-4 mb-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-3xl font-bold text-white pixel-text drop-shadow-lg">🎮 Pixel Card Quest</h1>
                <div className="stats-bar bg-blue-600 border-2 border-blue-800 rounded px-3 py-1">
                  <span className="text-white font-bold">Cards: {stats.total} | Liked: {stats.liked}</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <PixelButton variant="secondary" onClick={() => setShowCollection(true)}>
                  📚 Collection ({collection.length})
                </PixelButton>
              </div>
            </div>
          </div>
          
          {/* Main Game Area */}
          <div className="game-area flex justify-center items-center min-h-96">
            {isLoading ? (
              <div className="loading-container text-center">
                <div className="pixel-spinner mb-4"></div>
                <p className="text-white text-xl">Generating pixel magic...</p>
              </div>
            ) : currentCard ? (
              <PixelCard 
                card={currentCard}
                onLike={() => handleCardAction(true)}
                onDislike={() => handleCardAction(false)}
              />
            ) : (
              <div className="text-center text-white">
                <p className="text-xl mb-4">No more cards available!</p>
                <PixelButton onClick={loadInitialCards}>
                  🔄 Generate New Cards
                </PixelButton>
              </div>
            )}
          </div>
          
          {/* Controls Help */}
          <div className="controls-help bg-gray-800 bg-opacity-50 border-2 border-gray-600 rounded-lg p-4 mt-6 text-center">
            <p className="text-white">
              💖 <strong>Like</strong> cards to add them to your collection | 💔 <strong>Pass</strong> to see the next card
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <GameUI />
    </div>
  );
}

export default App;