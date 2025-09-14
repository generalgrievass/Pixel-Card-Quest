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
              <div key={card.id} className="collection-card bg-gradient-to-b from-pink-200 to-pink-300 border-4 border-pink-600 rounded-lg p-4 shadow-lg">
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const GameUI = () => {
  const [currentCard, setCurrentCard] = useState(null);
  const [nextCard, setNextCard] = useState(null);
  const [collection, setCollection] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
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
      // First try to get existing cards
      let cards = await fetchCards();
      
      // If we don't have enough cards, generate some
      if (cards.length < 5) {
        const newCard = await generateNewCard();
        if (newCard) {
          cards.unshift(newCard);
        }
      }
      
      // Filter out already liked cards and set up the queue
      const availableCards = cards.filter(card => !card.is_liked);
      setCardQueue(availableCards.slice(1));
      if (availableCards.length > 0) {
        setCurrentCard(availableCards[0]);
      }
      
      // Load next card
      if (availableCards.length > 1) {
        setNextCard(availableCards[1]);
      } else {
        const newCard = await generateNewCard();
        setNextCard(newCard);
      }
      
    } catch (error) {
      console.error('Error loading initial cards:', error);
    } finally {
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