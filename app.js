let gameSequence = [];
let userSequence = [];
let btnColors = ["red", "yellow", "green", "blue"];

let started = false;
let level = 0;
let highScore = 0;

let h2 = document.querySelector("h2");
let scoreDisplay = document.querySelector("#score");
let highScoreDisplay = document.querySelector("#highScore");

const sounds = {
  red: new Audio("https://s3.amazonaws.com/freecodecamp/simonSound1.mp3"),
  yellow: new Audio("https://s3.amazonaws.com/freecodecamp/simonSound2.mp3"),
  green: new Audio("https://s3.amazonaws.com/freecodecamp/simonSound3.mp3"),
  blue: new Audio("https://s3.amazonaws.com/freecodecamp/simonSound4.mp3"),
  wrong: new Audio(
    "https://actions.google.com/sounds/v1/alarms/beep_short.ogg",
  ),
};

function startGame() {
  if (!started) {
    started = true;
    levelUp();
  }
}

document.addEventListener("keypress", startGame);
document.addEventListener("touchstart", startGame);

function btnFlash(btn) {
  let color = btn.id;
  sounds[color].currentTime = 0;
  sounds[color].play();

  btn.classList.add("flash");
  setTimeout(() => btn.classList.remove("flash"), 300);
}

function levelUp() {
  userSequence = [];
  level++;

  h2.innerText = `Level ${level}`;
  scoreDisplay.innerText = `Score: ${level - 1}`;

  if (level - 1 > highScore) {
    highScore = level - 1;
    highScoreDisplay.innerText = `High Score: ${highScore}`;
  }

  let randomIdx = Math.floor(Math.random() * 4);
  let randomColor = btnColors[randomIdx];
  let randomBtn = document.querySelector(`#${randomColor}`);

  gameSequence.push(randomColor);

  setTimeout(() => btnFlash(randomBtn), 500);
}

function btnPress() {
  let btn = this;
  btnFlash(btn);

  let userColor = btn.id;
  userSequence.push(userColor);

  checkAns(userSequence.length - 1);
}

let allBtns = document.querySelectorAll(".btn");
allBtns.forEach((btn) => btn.addEventListener("click", btnPress));

function checkAns(idx) {
  if (userSequence[idx] === gameSequence[idx]) {
    if (userSequence.length === gameSequence.length) {
      setTimeout(levelUp, 800);
    }
  } else {
    sounds.wrong.play();

    document.body.classList.add("game-over");
    setTimeout(() => document.body.classList.remove("game-over"), 300);

    h2.innerText = "Game Over — Press Any Key";

    reset();
  }
}

function reset() {
  started = false;
  gameSequence = [];
  userSequence = [];
  level = 0;
}
