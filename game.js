const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let gameStarted = false, gameOver = false;
let score = 0, life = 5, timeLeft = 90;
let bossSpawned = false;
let player = {
  x: canvas.width/2, y: canvas.height - 80,
  width: 40, height: 40,
  baseSpeed: 6, speed: 6,
  color: "lime", shield: false,
  shotInterval: 500, lastShotTime: 0
};
let bullets = [], enemies = [], powerUps = [];
let keys = {}, velocityX = 0;
let enemySpawnRate = 1000;
let enemySpawnTimer;

document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

function startGame(){
  score = 0; life = 5; timeLeft = 90;
  gameStarted = true; gameOver = false; bossSpawned = false;
  player.x = canvas.width/2; player.y = canvas.height - 80;
  player.shield = false; player.shotInterval = 500;
  bullets = []; enemies = []; powerUps = [];
  document.getElementById("startMessage").style.display = "none";
  document.getElementById("gameClearMessage").style.display = "none";
  document.getElementById("rankingDisplay").style.display = "none"; // ランキング隠す
  spawnEnemies();
  timerLoop();
  setupTouchControls();
  requestAnimationFrame(gameLoop);
}

function updateUI(){
  document.getElementById("scoreDisplay").textContent = `スコア: ${score}`;
  document.getElementById("timerDisplay").textContent = `時間: ${timeLeft}`;
  document.getElementById("lifeDisplay").textContent = `ライフ: ${life}`;
  let text = "パワーアップ: ";
  if(player.shield) text += "シールド ";
  if(player.speed > player.baseSpeed) text += "スピード ";
  if(player.shotInterval < 500) text += "連射 ";
  if(text === "パワーアップ: ") text += "なし";
  document.getElementById("powerupDisplay").textContent = text;
}

function drawRect(obj){
  ctx.fillStyle = obj.color;
  ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
}

function drawPlayer(){
  drawRect(player);
  if(player.shield){
    ctx.strokeStyle = "cyan"; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x + player.width/2, player.y + player.height/2, player.width, 0, Math.PI*2);
    ctx.stroke();
  }
}

function shootBullet(){
  const now = Date.now();
  if(now - player.lastShotTime < player.shotInterval) return;
  bullets.push({ x: player.x + player.width/2 - 2.5, y: player.y, width: 5, height: 20 });
  player.lastShotTime = now;
}

document.addEventListener("keydown", e => {
  if(e.key === " " || e.key === "z") shootBullet();
});

function handlePlayerMovement(){
  const accel = 1.5, max = player.speed;
  if(keys["ArrowLeft"]) velocityX = Math.max(velocityX - accel, -max);
  else if(keys["ArrowRight"]) velocityX = Math.min(velocityX + accel, max);
  else velocityX *= 0.8;

  player.x += velocityX;
  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
}

function drawBullets(){
  ctx.fillStyle = "yellow";
  for(let i = bullets.length-1; i >= 0; i--){
    bullets[i].y -= 15;
    ctx.fillRect(bullets[i].x, bullets[i].y, bullets[i].width, bullets[i].height);
    if(bullets[i].y < 0) bullets.splice(i, 1);
  }
}

function spawnEnemies(){
  enemySpawnTimer = setInterval(() => {
    if(gameOver) return;
    let e = {}, rand = Math.random();
    if(rand < 0.6)
      e = {color:"red", hp:1, score:10, damage:1, speed:3};
    else if(rand < 0.9)
      e = {color:"blue", hp:4, score:30, damage:2, speed:2};
    else if(rand < 0.98)
      e = {color:"gold", hp:10, score:80, damage:999, speed:1};
    else
      e = {color:"magenta", hp:20, score:600, damage:999, speed:1};
    e.x = Math.random() * (canvas.width - 40);
    e.y = -40; e.width = 40; e.height = 40; e.hitCount = 0;
    enemies.push(e);
  }, enemySpawnRate);
}

function spawnBoss(){
  enemies.push({
    x: canvas.width/2 - 50, y: -80, width: 100, height: 100,
    color: "orange", hp: 30, hitCount: 0, speed: 1, damage: 999, score: 300, isBoss: true
  });
}

function drawEnemies(){
  for(let i=enemies.length-1; i>=0; i--){
    let e = enemies[i];
    e.y += e.speed;
    ctx.fillStyle = e.color;
    ctx.fillRect(e.x, e.y, e.width, e.height);

    for(let j=bullets.length-1; j>=0; j--){
      let b = bullets[j];
      if(b.x < e.x + e.width && b.x + b.width > e.x &&
         b.y < e.y + e.height && b.y + b.height > e.y){
        e.hitCount++;
        bullets.splice(j,1);
        if(e.hitCount >= e.hp){
          enemyDefeated(e, i);
          break;
        }
      }
    }

    if(!player.shield &&
      e.x < player.x + player.width && e.x + e.width > player.x &&
      e.y < player.y + player.height && e.y + e.height > player.y){
      enemies.splice(i,1);
      if(e.damage >= 999){ life = 0; endGame(false); return; }
      else { life -= e.damage; if(life <= 0){ endGame(false); return; } }
    }

    if(e.y > canvas.height) enemies.splice(i,1);
  }
}

function enemyDefeated(e, index){
  score += e.score;
  enemies.splice(index,1);
  if(e.isBoss){
    applyPowerUp("speed");
    applyPowerUp("rapid");
    applyPowerUp("life");
    applyPowerUp("shield");
    clearInterval(enemySpawnTimer);
    enemySpawnRate /= 2;
    spawnEnemies();
    setTimeout(() => {
      clearInterval(enemySpawnTimer);
      enemySpawnRate *= 2;
      spawnEnemies();
    }, 10000);
  } else {
    let chance = 0;
    if(e.color === "red") chance = 0.1;
    if(e.color === "blue") chance = 0.5;
    if(e.color === "gold" || e.color === "magenta") chance = 1.0;
    if(Math.random() < chance){
      let types = ["speed","rapid","life","shield"];
      let t = types[Math.floor(Math.random()*types.length)];
      let color = {speed:"#0ff", rapid:"#ffa500", life:"#ff69b4", shield:"#90ee90"}[t];
      powerUps.push({x:e.x,y:e.y,width:30,height:30,color,speed:3,type:t});
    }
  }
}

function drawPowerUps(){
  for(let i=powerUps.length-1; i>=0; i--){
    let p = powerUps[i]; p.y += p.speed;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.width, p.height);
    if(p.y > canvas.height) powerUps.splice(i,1);
    if(p.x < player.x + player.width && p.x + p.width > player.x &&
       p.y < player.y + player.height && p.y + p.height > player.y){
      applyPowerUp(p.type);
      powerUps.splice(i,1);
    }
  }
}

function applyPowerUp(type){
  if(type === "speed"){
    player.speed = player.baseSpeed + 4;
    setTimeout(()=>{player.speed = player.baseSpeed;},5000);
  }
  if(type === "rapid"){
    player.shotInterval = 150;
    setTimeout(()=>{player.shotInterval = 500;},5000);
  }
  if(type === "life" && life < 5) life++;
  if(type === "shield"){
    player.shield = true;
    setTimeout(()=>{player.shield = false;},5000);
  }
}

function checkBoss(){
  if(!bossSpawned && score >= 600){
    bossSpawned = true;
    spawnBoss();
  }
}

function timerLoop(){
  setInterval(()=>{
    if(gameOver) return;
    timeLeft--;
    if(timeLeft <= 0) endGame(score >= 900);
  },1000);
}

function endGame(clear){
  gameOver = true;
  clearInterval(enemySpawnTimer);
  const msg = document.getElementById("gameClearMessage");
  msg.style.display = "block";
  msg.style.color = clear ? "#0f0" : "#f00";
  msg.textContent = clear ? `ゲームクリア！スコア: ${score}` : `ゲームオーバー！スコア: ${score}`;
  
  saveScore(score);
  showRanking();
}

function gameLoop(){
  if(!gameStarted || gameOver) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  if(isMobileDevice()){
    handleTouchMovement();
  } else {
    handlePlayerMovement();
  }

  drawPlayer();
  drawBullets();
  drawEnemies();
  drawPowerUps();
  updateUI();
  checkBoss();
  requestAnimationFrame(gameLoop);
}

// -----------------
// ローカルストレージでスコア保存＆ランキング表示
function saveScore(score) {
  const scores = JSON.parse(localStorage.getItem("shootingScores") || "[]");
  scores.push(score);
  scores.sort((a,b) => b - a);
  if(scores.length > 5) scores.length = 5;
  localStorage.setItem("shootingScores", JSON.stringify(scores));
}

function loadRanking() {
  const scores = JSON.parse(localStorage.getItem("shootingScores") || "[]");
  return scores;
}

function showRanking() {
  const rankingDiv = document.getElementById("rankingDisplay");
  const rankingList = document.getElementById("rankingList");
  const scores = loadRanking();
  rankingList.innerHTML = "";
  if(scores.length === 0){
    rankingList.innerHTML = "<li>記録なし</li>";
  } else {
    scores.forEach(s => {
      const li = document.createElement("li");
      li.textContent = `${s} 点`;
      rankingList.appendChild(li);
    });
  }
  rankingDiv.style.display = "block";
}

// -----------------
// スマホ判定と仮想ボタン表示＆操作

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Windows Phone|Mobi/i.test(navigator.userAgent);
}

function setupTouchControls(){
  const controls = document.getElementById("touchControls");
  if(isMobileDevice()){
    controls.style.display = "block";

    let leftPressed = false, rightPressed = false, shootPressed = false;

    const btnLeft = document.getElementById("btnLeft");
    const btnRight = document.getElementById("btnRight");
    const btnShoot = document.getElementById("btnShoot");

    btnLeft.addEventListener("touchstart", e => { e.preventDefault(); leftPressed = true; });
    btnLeft.addEventListener("touchend", e => { e.preventDefault(); leftPressed = false; });

    btnRight.addEventListener("touchstart", e => { e.preventDefault(); rightPressed = true; });
    btnRight.addEventListener("touchend", e => { e.preventDefault(); rightPressed = false; });

    btnShoot.addEventListener("touchstart", e => { e.preventDefault(); shootPressed = true; });
    btnShoot.addEventListener("touchend", e => { e.preventDefault(); shootPressed = false; });

    window.touchState = { leftPressed, rightPressed, shootPressed };

    // 毎フレーム状態更新
    function updateTouchState(){
      window.touchState.leftPressed = leftPressed;
      window.touchState.rightPressed = rightPressed;
      window.touchState.shootPressed = shootPressed;
      requestAnimationFrame(updateTouchState);
    }
    updateTouchState();
  } else {
    controls.style.display = "none";
  }
}

function handleTouchMovement(){
  const accel = 1.5, max = player.speed;
  if(window.touchState?.leftPressed) velocityX = Math.max(velocityX - accel, -max);
  else if(window.touchState?.rightPressed) velocityX = Math.min(velocityX + accel, max);
  else velocityX *= 0.8;

  player.x += velocityX;
  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));

  if(window.touchState?.shootPressed) shootBullet();
}
