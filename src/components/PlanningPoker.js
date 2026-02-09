import React, { useState, useEffect } from 'react';
import { FaPlay, FaEye, FaEyeSlash, FaRedo, FaCheck, FaTimes } from 'react-icons/fa';

const FIBONACCI_CARDS = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, '?'];
const TSHIRT_CARDS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?'];

const PlanningPoker = ({ 
  isOpen, 
  onClose, 
  currentTask, 
  onEstimationComplete,
  teamMembers = ['Alice', 'Bob', 'Carol', 'Dave']
}) => {
  const [selectedCard, setSelectedCard] = useState(null);
  const [cardSet, setCardSet] = useState('fibonacci'); // 'fibonacci' or 'tshirt'
  const [votes, setVotes] = useState({});
  const [revealed, setRevealed] = useState(false);
  const [gamePhase, setGamePhase] = useState('waiting'); // 'waiting', 'voting', 'revealed', 'complete'
  const [currentPlayer, setCurrentPlayer] = useState('Alice'); // Demo için sabit
  const [discussion, setDiscussion] = useState('');
  const [consensus, setConsensus] = useState(null);

  const cards = cardSet === 'fibonacci' ? FIBONACCI_CARDS : TSHIRT_CARDS;

  const handleCardSelect = (card) => {
    if (gamePhase === 'voting') {
      setSelectedCard(card);
      setVotes(prev => ({
        ...prev,
        [currentPlayer]: card
      }));
    }
  };

  const handleStartVoting = () => {
    setGamePhase('voting');
    setVotes({});
    setSelectedCard(null);
    setRevealed(false);
    setConsensus(null);
  };

  const handleRevealVotes = () => {
    setRevealed(true);
    setGamePhase('revealed');
    
    // Consensus hesaplama
    const voteCounts = {};
    Object.values(votes).forEach(vote => {
      voteCounts[vote] = (voteCounts[vote] || 0) + 1;
    });
    
    const maxVotes = Math.max(...Object.values(voteCounts));
    const mostVoted = Object.keys(voteCounts).filter(key => voteCounts[key] === maxVotes);
    
    if (mostVoted.length === 1) {
      setConsensus(mostVoted[0]);
    }
  };

  const handleCompleteEstimation = () => {
    if (consensus) {
      onEstimationComplete({
        taskId: currentTask?.id,
        estimation: consensus,
        votes: votes,
        discussion: discussion
      });
      setGamePhase('complete');
    }
  };

  const handleReset = () => {
    setSelectedCard(null);
    setVotes({});
    setRevealed(false);
    setGamePhase('waiting');
    setConsensus(null);
    setDiscussion('');
  };

  const getVoteStatus = () => {
    const totalPlayers = teamMembers.length;
    const votedPlayers = Object.keys(votes).length;
    return `${votedPlayers}/${totalPlayers} votes cast`;
  };

  const getConsensusStatus = () => {
    if (!revealed) return null;
    
    const voteCounts = {};
    Object.values(votes).forEach(vote => {
      voteCounts[vote] = (voteCounts[vote] || 0) + 1;
    });
    
    const maxVotes = Math.max(...Object.values(voteCounts));
    const mostVoted = Object.keys(voteCounts).filter(key => voteCounts[key] === maxVotes);
    
    if (mostVoted.length === 1) {
      return `Consensus: ${mostVoted[0]}`;
    } else {
      return 'No consensus - re-voting required';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Planning Poker</h2>
            <p className="text-gray-600 mt-1">
              {currentTask?.title || 'No task selected'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes size={24} />
          </button>
        </div>

        {/* Game Status */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm font-medium text-gray-600">Status: </span>
              <span className={`text-sm font-bold ${
                gamePhase === 'waiting' ? 'text-yellow-600' :
                gamePhase === 'voting' ? 'text-blue-600' :
                gamePhase === 'revealed' ? 'text-green-600' :
                'text-gray-600'
              }`}>
                {gamePhase === 'waiting' ? 'Waiting for votes' :
                 gamePhase === 'voting' ? 'Voting in progress' :
                 gamePhase === 'revealed' ? 'Votes revealed' :
                 'Completed'}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {getVoteStatus()}
            </div>
          </div>
          
          {revealed && (
            <div className="mt-2">
              <span className="text-sm font-medium text-gray-600">Result: </span>
              <span className="text-sm font-bold text-green-600">
                {getConsensusStatus()}
              </span>
            </div>
          )}
        </div>

        {/* Card Set Selection */}
        <div className="p-6 border-b">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-600">Card Set:</span>
            <div className="flex space-x-2">
              <button
                onClick={() => setCardSet('fibonacci')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  cardSet === 'fibonacci'
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                Fibonacci
              </button>
              <button
                onClick={() => setCardSet('tshirt')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  cardSet === 'tshirt'
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                T-Shirt
              </button>
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className="p-6">
          <div className="grid grid-cols-6 gap-4 mb-6">
            {cards.map((card, index) => (
              <button
                key={index}
                onClick={() => handleCardSelect(card)}
                className={`h-20 rounded-lg border-2 transition-all transform hover:scale-105 ${
                  selectedCard === card
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-lg'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center h-full text-lg font-bold">
                  {card}
                </div>
              </button>
            ))}
          </div>

          {/* Game Controls */}
          <div className="flex justify-center space-x-4">
            {gamePhase === 'waiting' && (
              <button
                onClick={handleStartVoting}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaPlay size={16} />
                <span>Start Voting</span>
              </button>
            )}

            {gamePhase === 'voting' && (
              <>
                <button
                  onClick={handleRevealVotes}
                  className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <FaEye size={16} />
                  <span>Reveal Votes</span>
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center space-x-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <FaRedo size={16} />
                  <span>Reset</span>
                </button>
              </>
            )}

            {gamePhase === 'revealed' && (
              <>
                <button
                  onClick={handleCompleteEstimation}
                  disabled={!consensus}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors ${
                    consensus
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                >
                  <FaCheck size={16} />
                  <span>Complete Estimation</span>
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center space-x-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <FaRedo size={16} />
                  <span>Vote Again</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Votes Display */}
        {revealed && (
          <div className="p-6 border-t bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Votes</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {teamMembers.map((member) => (
                <div key={member} className="bg-white p-4 rounded-lg border">
                  <div className="text-sm font-medium text-gray-600">{member}</div>
                  <div className="text-lg font-bold text-gray-800 mt-1">
                    {votes[member] || 'No vote'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Discussion */}
        <div className="p-6 border-t">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Discussion</h3>
          <textarea
            value={discussion}
            onChange={(e) => setDiscussion(e.target.value)}
            placeholder="Add your notes about the estimation here..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-300 resize-none"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
};

export default PlanningPoker; 