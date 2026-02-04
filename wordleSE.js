// ==UserScript==
// @name         Wordle Suggestion Engine
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  try to take over the wordle!
// @author       iam7mza
// @match        https://www.nytimes.com/games/wordle/index.html
// @icon         https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Wordle_Logo.svg/960px-Wordle_Logo.svg.png
// @grant        none
// ==/UserScript==

(async function() {
    'use strict';


// getting tiles
const tiles = document.getElementsByClassName("Tile-module_tile__UWEHN");

// function to read current state of the game
function read() {

    let letters = [];
    let states = [];
    // getting letters and states of letters from tiles
    for (var i = 0; i < 30; i++) {

        letters.push(tiles[i].textContent);
        states.push(tiles[i].dataset.state);
    }


    // index of next empty tile


    // returning next index, and last 5 letters with their states
    return [letters, states];
};


let ghostIndex = null;
// function to write the suggested word
function write(word, nextIndex, lastState) {

    // NOTEs: Index must be >= 5
    // if index is not devisible by 5 round it to next multiple of 5

    if (nextIndex % 5 != 0 || lastState == "tbd") {
        return;
    }


    for (var i = 0; i < 5; i++) {
        tiles[nextIndex + i].textContent = word[i];
        tiles[nextIndex + i].style.color = 'grey';
    }
    ghostIndex = nextIndex;
}

function clearGhost() {
    if (ghostIndex == null) {
        return;
    }
    for (var i = 0; i < 5; i++) {
        tiles[ghostIndex + i].style.color = 'white';
        tiles[ghostIndex + i].textContent = "";
    }
    ghostIndex = null;
}




// key listener
// clears ghost word on any key press except enter
document.addEventListener(
    "keydown",
    (e) => {
        if (ghostIndex != null && e.key !== "Enter") {
            clearGhost();
        }
    }
);


// getting word list

let url = "https://raw.githubusercontent.com/seanpatlan/wordle-words/main/word-bank.csv" // word list I found on github
async function loadWordList() {
  const res = await fetch(url);
  const text = await res.text();

  // CSV to array
  return text
    .split("\n")
    .map(w => w.trim())
    .filter(Boolean);
}


let words = await loadWordList();


// updating wordlist given previous word results

function updateWordList(letters, states, nextIndex) {
   // First pass: identify which letters are confirmed in the word
   const confirmedLetters = new Set();
   for (let i = nextIndex - 5; i < nextIndex; i++) {
       if (states[i] === "correct" || states[i] === "present") {
           confirmedLetters.add(letters[i]);
       }
   }

   // Second pass: filter words
   for (let i = nextIndex - 5; i < nextIndex; i++) {
       const letter = letters[i];
       const state = states[i];
       const position = i % 5;

       if (state === "correct") {
           words = words.filter(w => w[position] === letter);
       } else if (state === "present") {
           words = words.filter(w => w.includes(letter) && w[position] !== letter);
       } else if (state === "absent") {
           // Only remove words with this letter if it's NOT confirmed elsewhere
           if (!confirmedLetters.has(letter)) {
               words = words.filter(w => !w.includes(letter));
           }
           // If the letter IS confirmed, this "absent" just means "not at THIS position"
           // which is already handled by correct/present constraints
       }
   }
}


// animation end listener
// writes ghost word after tile animation ends
document.addEventListener("animationend", (e) => {
    const tile = e.target;

    if (
        tile.classList.contains("Tile-module_tile__UWEHN") &&
        tile.dataset.animation === "idle" &&
        ghostIndex == null
    ) {
        const [letters, states] = read();
        const nextIndex = letters.indexOf("");
        if (states[nextIndex - 1] !== "tbd") {
        updateWordList(letters, states, nextIndex);
        console.log(nextIndex);
        console.log(letters);
        console.log(states);
        console.log("words left:", words?.length);
        }

        // Game End Condition!!
        let gameOver = false;
        if(states.slice(nextIndex-5, nextIndex).every(i => i === "correct")){
            gameOver = true;
        }
        let randomWord = words[Math.floor(Math.random() * words.length)];

        if(gameOver){
            randomWord = "★★★★★";
        }
        write(randomWord, nextIndex, states[nextIndex - 1]);
    }
});

})();