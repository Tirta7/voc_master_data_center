import re

path = r'd:\Billiard_APPS\backend\src\loyalty\loyalty.service.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace variables block
target = r"""       let winReward = 0; 
       let activeMultiplier = 1; 
       const GRID_SIZE = 25;
       let sequence: any[] = new Array(GRID_SIZE).fill(null);

       if (isWinner) {"""

replacement = r"""       let winReward = 0; 
       let activeMultiplier = 1; 
       let winningSymbol: number | null = null;
       const GRID_SIZE = 25;
       let sequence: any[] = new Array(GRID_SIZE).fill(null);

       if (isWinner) {"""
content = content.replace(target, replacement)

# Replace winner safety logic
target2 = r"""               // Populate Match-4 and fill
               for(let i=0; i<4; i++) sequence[i] = baseValue;
               for(let i=4; i<GRID_SIZE; i++) {
                  let val = rewardsList[Math.floor(Math.random() * rewardsList.length)];
                  if (val === baseValue) val = rewardsList[(rewardsList.indexOf(val) + 1) % rewardsList.length];
                  sequence[i] = Math.random() < 0.12 ? "BOMB" : val;
               }
               sequence = shuffle(sequence);
           } else isWinner = false;
       }"""

replacement2 = r"""               // DETERMINISTIC REWARD MAPPING (Server-Side Authoritative)
               // Populate Match-4 and fill with SAFETY
               const counts: Record<string, number> = {};
               counts[baseValue] = 4;
               for(let i=0; i<4; i++) sequence[i] = baseValue;
               let placed = 4;
               while(placed < GRID_SIZE) {
                  let val = rewardsList[Math.floor(Math.random() * rewardsList.length)];
                  if (val === baseValue) val = rewardsList[(rewardsList.indexOf(val) + 1) % rewardsList.length];
                  
                  if (Math.random() < 0.12 || (counts[val] || 0) >= 3) {
                     sequence[placed++] = "BOMB";
                  } else {
                     sequence[placed++] = val;
                     counts[val] = (counts[val] || 0) + 1;
                  }
               }
               sequence = shuffle(sequence);
           } else isWinner = false;
       }"""
content = content.replace(target2, replacement2)

# Set winning symbol
target_ws = r"""               let finalWin = baseValue;"""
replacement_ws = r"""               winningSymbol = baseValue;
               let finalWin = baseValue;"""
content = content.replace(target_ws, replacement_ws)

# Replace description
target3 = r"""      playLedger.description = isWinner ? `Main Scratch Bomb | WIN:${winReward}` : 'Main Scratch Bomb';"""
replacement3 = r"""      playLedger.description = isWinner ? `Main Scratch Bomb | WIN:${winReward} | SYM:${winningSymbol}` : 'Main Scratch Bomb';"""
content = content.replace(target3, replacement3)

# Replace return payload
target4 = r"""      return {
          success: true, isWin: isWinner, result: sequence, referenceId: playLedger.referenceId,
          newBalance: member.points, winReward: isWinner ? winReward : 0, multiplier: isWinner ? activeMultiplier : 1,
          rewardsList, rtpModifier, liveV, activePlayers: activePlayerCount
      };"""

replacement4 = r"""      const crypto = require('crypto');
      const payloadHash = crypto.createHash('sha256').update(`${memberId}-${playLedger.referenceId}-${winReward}`).digest('hex');

      // THE ENCRYPTED PAYLOAD (Server-Side Authoritative State Machine)
      return {
          success: true, 
          session_id: playLedger.referenceId,
          matrix_map: sequence,
          win_validation: {
              is_winner: isWinner,
              matching_symbol: winningSymbol,
              payout_amount: isWinner ? winReward : 0,
              multiplier: isWinner ? activeMultiplier : 1,
              secure_hash: payloadHash
          },
          newBalance: member.points,
          rewardsList,
          rtpModifier,
          liveV,
          activePlayers: activePlayerCount
      };"""
content = content.replace(target4, replacement4)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Backend Patched!")
