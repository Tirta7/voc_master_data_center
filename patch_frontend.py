import re

path = r'd:\Billiard_APPS\frontend\src\app\member\play\scratch-bomb\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add winValidation state
target_state = r"""  const [winMultiplier, setWinMultiplier] = useState(1);
  const [highTension, setHighTension] = useState(false);"""

replacement_state = r"""  const [winMultiplier, setWinMultiplier] = useState(1);
  const [winValidation, setWinValidation] = useState<any>(null); // EXPERT PAYLOAD
  const [highTension, setHighTension] = useState(false);"""
content = content.replace(target_state, replacement_state)

# Update startGame handler
target_start = r"""        setPoints(Number(data.newBalance));
        setGameResult(data.result || []);
        setScratchedBoxes([]);
        scratchedBoxesRef.current = [];
        setIsGameOver(false); isGameOverRef.current = false;
        setWinReward(data.winReward || 0);
        setWinMultiplier(data.multiplier || 1);
        setIsWonGame(data.isWin || false);
        setLiveV(data.liveV || 1.0);
        if (data.activePlayers !== undefined) setActivePlayers(data.activePlayers);
        setCurrentPlayRef(data.referenceId || null);"""

replacement_start = r"""        setPoints(Number(data.newBalance));
        setGameResult(data.matrix_map || data.result || []);
        setWinValidation(data.win_validation || null);
        setScratchedBoxes([]);
        scratchedBoxesRef.current = [];
        setIsGameOver(false); isGameOverRef.current = false;
        
        // --- SINGLE SOURCE OF TRUTH ---
        let win = false; let reward = 0; let mult = 1;
        if (data.win_validation) {
            win = data.win_validation.is_winner;
            reward = data.win_validation.payout_amount;
            mult = data.win_validation.multiplier;
        } else {
            win = data.isWin || false; reward = data.winReward || 0; mult = data.multiplier || 1;
        }

        setWinReward(reward);
        setWinMultiplier(mult);
        setIsWonGame(win);
        setLiveV(data.liveV || 1.0);
        if (data.activePlayers !== undefined) setActivePlayers(data.activePlayers);
        setCurrentPlayRef(data.session_id || data.referenceId || null);"""
content = content.replace(target_start, replacement_start)

# Update handleBoxClick logic
target_click = r"""    if (matches === 4) {
      setIsGameOver(true);
      isGameOverRef.current = true;
      setIsWonGame(true);
      setIsProcessing(true);
      
      setGameOverMessage(winReward >= betAmount * 10 ? "MEGA WIN!" : "VICTORY!");
      playSound('win');
      setPersonalHistory(prev => [{ 
        reward: winReward, 
        type: winReward >= betAmount * 10 ? "MEGA WIN" : "SMALL WIN", 
        multiplier: winMultiplier, 
        time: new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit'}) 
      }, ...prev]);
      
      if (winMultiplier >= 5) setShowConfetti(true);
      axios.post(`${API_URL}/loyalty/game/scratch/claim`, { memberId: parseInt(id, 10), referenceId: currentPlayRef });

      const delay = isTurbo ? 600 : 2500;"""

replacement_click = r"""    if (matches === 4) {
      // --- SERVER-SIDE AUTHORITATIVE VALIDATION ---
      let isValidWin = true;
      let hash = "";
      if (winValidation) {
          isValidWin = winValidation.is_winner && winValidation.matching_symbol === val;
          hash = winValidation.secure_hash;
      }

      setIsGameOver(true);
      isGameOverRef.current = true;
      setIsProcessing(true);
      
      if (isValidWin) {
          setIsWonGame(true);
          setGameOverMessage(winReward >= betAmount * 10 ? "MEGA WIN!" : "VICTORY!");
          playSound('win');
          setPersonalHistory(prev => [{ 
            reward: winReward, 
            type: winReward >= betAmount * 10 ? "MEGA WIN" : "SMALL WIN", 
            multiplier: winMultiplier, 
            time: new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit'}) 
          }, ...prev]);
          if (winMultiplier >= 5) setShowConfetti(true);
          axios.post(`${API_URL}/loyalty/game/scratch/claim`, { memberId: parseInt(id, 10), referenceId: currentPlayRef, security_hash: hash });
      } else {
          setIsWonGame(false);
          setGameOverMessage("ANOMALY BLOCKED");
          playSound('explosion');
      }

      const delay = isTurbo ? 600 : 2500;"""
content = content.replace(target_click, replacement_click)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Frontend Patched!")
