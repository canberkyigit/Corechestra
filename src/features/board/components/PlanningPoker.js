import React, { useEffect, useState } from 'react';
import { FaPlay, FaEye, FaRedo, FaCheck, FaTimes } from 'react-icons/fa';
import { useEscapeKey } from '../hooks/useEscapeKey';

const FIBONACCI_CARDS = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, '?'];
const TSHIRT_CARDS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?'];

export function getPokerConsensus(votes = {}) {
  const voteCounts = new Map();
  Object.values(votes).forEach((vote) => {
    voteCounts.set(vote, (voteCounts.get(vote) || 0) + 1);
  });

  if (voteCounts.size === 0) return null;

  const maxVotes = Math.max(...voteCounts.values());
  const mostVoted = [...voteCounts.entries()]
    .filter(([, count]) => count === maxVotes)
    .map(([vote]) => vote);

  return mostVoted.length === 1 ? mostVoted[0] : null;
}

const PlanningPoker = ({ 
  isOpen, 
  onClose, 
  currentTask, 
  onEstimationComplete,
  teamMembers: teamMembersProp,
  currentPlayer: currentPlayerProp,
}) => {
  // No placeholder team: fall back to the signed-in player only.
  const currentPlayer = currentPlayerProp || teamMembersProp?.[0] || 'You';
  const teamMembers = teamMembersProp && teamMembersProp.length > 0
    ? (teamMembersProp.includes(currentPlayer) ? teamMembersProp : [currentPlayer, ...teamMembersProp])
    : [currentPlayer];
  const [selectedCard, setSelectedCard] = useState(null);
  const [cardSet, setCardSet] = useState('fibonacci'); // 'fibonacci' or 'tshirt'
  const [votes, setVotes] = useState({});
  const [revealed, setRevealed] = useState(false);
  const [gamePhase, setGamePhase] = useState('waiting'); // 'waiting', 'voting', 'revealed', 'complete'
  const [discussion, setDiscussion] = useState('');
  const [consensus, setConsensus] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedCard(null);
    setVotes({});
    setRevealed(false);
    setGamePhase('waiting');
    setConsensus(null);
    setDiscussion('');
  }, [isOpen, currentTask?.id]);

  useEscapeKey(() => onClose?.(), Boolean(isOpen));

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
    setConsensus(getPokerConsensus(votes));
  };

  const handleCompleteEstimation = () => {
    if (consensus !== null && consensus !== undefined) {
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

    const result = getPokerConsensus(votes);
    return result !== null
      ? `Consensus: ${result}`
      : 'No consensus - re-voting required';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Planning Poker"
        className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-[#2a3044]">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Planning Poker</h2>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {currentTask?.title || 'No task selected'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            title="Close"
          >
            <FaTimes size={24} />
          </button>
        </div>

        {/* Game Status */}
        <div className="p-6 border-b border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#141720]">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Status: </span>
              <span className={`text-sm font-bold ${
                gamePhase === 'waiting' ? 'text-yellow-600 dark:text-yellow-400' :
                gamePhase === 'voting' ? 'text-blue-600 dark:text-blue-400' :
                gamePhase === 'revealed' ? 'text-green-600 dark:text-green-400' :
                'text-slate-600 dark:text-slate-300'
              }`}>
                {gamePhase === 'waiting' ? 'Waiting for votes' :
                 gamePhase === 'voting' ? 'Voting in progress' :
                 gamePhase === 'revealed' ? 'Votes revealed' :
                 'Completed'}
              </span>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {getVoteStatus()}
            </div>
          </div>
          
          {revealed && (
            <div className="mt-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Result: </span>
              <span className="text-sm font-bold text-green-600 dark:text-green-400">
                {getConsensusStatus()}
              </span>
            </div>
          )}
        </div>

        {/* Card Set Selection */}
        <div className="p-6 border-b border-slate-200 dark:border-[#2a3044]">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Card Set:</span>
            <div className="flex space-x-2">
              <button
                onClick={() => setCardSet('fibonacci')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  cardSet === 'fibonacci'
                    ? 'bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700'
                    : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200 dark:bg-[#232838] dark:text-slate-300 dark:border-[#2a3044] dark:hover:bg-[#2a3044]'
                }`}
              >
                Fibonacci
              </button>
              <button
                onClick={() => setCardSet('tshirt')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  cardSet === 'tshirt'
                    ? 'bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700'
                    : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200 dark:bg-[#232838] dark:text-slate-300 dark:border-[#2a3044] dark:hover:bg-[#2a3044]'
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
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-lg dark:bg-blue-900/30 dark:text-blue-300'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:border-[#2a3044] dark:bg-[#232838] dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-[#2a3044]'
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
                  disabled={Object.keys(votes).length === 0}
                  className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-slate-400 disabled:text-slate-200 dark:disabled:bg-slate-700 disabled:cursor-not-allowed"
                >
                  <FaEye size={16} />
                  <span>Reveal Votes</span>
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center space-x-2 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
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
                  disabled={consensus === null || consensus === undefined}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors ${
                    consensus !== null && consensus !== undefined
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-slate-400 text-slate-200 dark:bg-slate-700 dark:text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <FaCheck size={16} />
                  <span>Complete Estimation</span>
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center space-x-2 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
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
          <div className="p-6 border-t border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#141720]">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Votes</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {teamMembers.map((member) => (
                <div key={member} className="bg-white dark:bg-[#1c2030] p-4 rounded-lg border border-slate-200 dark:border-[#2a3044]">
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-400">{member}</div>
                  <div className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-1" data-testid={`poker-vote-${member}`}>
                    {votes[member] ?? 'No vote'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Discussion */}
        <div className="p-6 border-t border-slate-200 dark:border-[#2a3044]">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Discussion</h3>
          <textarea
            value={discussion}
            onChange={(e) => setDiscussion(e.target.value)}
            placeholder="Add your notes about the estimation here..."
            className="w-full p-3 border border-slate-300 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-700 dark:text-slate-200 placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-300 resize-none"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
};

export default PlanningPoker;
