//script.js
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import '@xterm/xterm/css/xterm.css';

// Custom beep function using Web Audio API
function squareBeep(freq = 440, duration = 0.1) {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = 'square';
  oscillator.frequency.value = freq; // in Hz

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.start();
  oscillator.stop(audioCtx.currentTime + duration);
}

// ANSI color codes for terminal formatting
const colors = {
  reset: '\x1B[0m',
  bold: '\x1B[1m',
  italic: '\x1B[3m',
  green: '\x1B[1;32m',
  blue: '\x1B[1;34m',
  yellow: '\x1B[1;33m',
  red: '\x1B[1;3;31m'
};

var term = new Terminal();
term.open(document.getElementById('terminal'));

// Fit terminal to container
let fitAddon = new FitAddon();
term.loadAddon(fitAddon);
fitAddon.fit();
window.addEventListener('resize', () => {
  fitAddon.fit();
});

term.open(document.getElementById('terminal'));
term.loadAddon(new WebLinksAddon());



let currentInput = '';
let currentLine = '';
let cursorPosition = 0;

// Available commands

// --- Virtual File System ---
let vfs = {};
const VFS_KEY = 'miaoshell-vfs';

function loadVFS() {
  try {
    const data = localStorage.getItem(VFS_KEY);
    if (data) vfs = JSON.parse(data);
    else vfs = {};
  } catch (e) {
    vfs = {};
  }
}

function saveVFS() {
  localStorage.setItem(VFS_KEY, JSON.stringify(vfs));
}

// Load VFS on startup
loadVFS();

const commands = {
  help: () => {
    term.writeln('\r\nAvailable commands:');
    term.writeln('  help     - Show this help message');
    term.writeln('  clear    - Clear the terminal');
    term.writeln('  echo     - Echo back your message');
    term.writeln('  date     - Show current date and time');
    term.writeln('  beep     - Make a beep sound');
    term.writeln('  ls       - List files in the virtual file system');
    term.writeln('  cat      - Show file contents: cat filename');
    term.writeln('  write    - Write to a file: write filename content');
    term.writeln('  rm       - Remove a file: rm filename');
    term.writeln('  save     - Save VFS to browser storage');
    term.writeln('  load     - Load VFS from browser storage');
    term.writeln('  about    - About this terminal');
  },
  clear: () => {
    setTimeout(() => {
      term.clear();
    }, 0);
  },
  echo: (args) => {
    term.writeln('\r\n' + args.join(' '));
  },
  date: () => {
    term.writeln('\r\n' + new Date().toString());
  },
  beep: () => {
    squareBeep();
    term.writeln('\r\n🔊 Beep!');
  },
  ls: () => {
    const files = Object.keys(vfs);
    if (files.length === 0) term.writeln('\r\n(no files)');
    else term.writeln('\r\n' + files.join('  '));
  },
  cat: (args) => {
    if (!args[0]) {
      term.writeln('\r\nUsage: cat filename');
      return;
    }
    const file = args[0];
    if (vfs[file] !== undefined) {
      term.writeln('\r\n' + vfs[file]);
    } else {
      term.writeln(`\r\nFile not found: ${file}`);
    }
  },
  write: (args) => {
    if (!args[0]) {
      term.writeln('\r\nUsage: write filename content');
      return;
    }
    const file = args[0];
    const content = args.slice(1).join(' ');
    vfs[file] = content;
    term.writeln(`\r\nWrote to ${file}`);
  },
  rm: (args) => {
    if (!args[0]) {
      term.writeln('\r\nUsage: rm filename');
      return;
    }
    const file = args[0];
    if (vfs[file] !== undefined) {
      delete vfs[file];
      term.writeln(`\r\nDeleted ${file}`);
    } else {
      term.writeln(`\r\nFile not found: ${file}`);
    }
  },
  save: () => {
    saveVFS();
    term.writeln('\r\nVFS saved to browser storage.');
  },
  load: () => {
    loadVFS();
    term.writeln('\r\nVFS loaded from browser storage.');
  },
  about: () => {
    term.writeln('\r\n' + colors.bold + 'MiaoShell' + colors.reset + ' - A Useless Terminal');
    term.writeln('Version: 1.0.0');
    term.writeln('https://github.com/daniel4-scratch/xtermtest');
  }
};

function executeCommand(input) {
  const parts = input.trim().split(' ');
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  if (command === '') {
    return;
  }

  if (commands[command]) {
    commands[command](args);
  } else {
    term.writeln('\r\nCommand not found: ' + command);
    term.writeln('Type "help" for available commands.');
  }
}

function prompt() {
  term.write(`\r\n${colors.green}user@miaoshell${colors.reset}:${colors.blue}~${colors.reset}$ `);
}

// Handle user input
term.onData(data => {
  const code = data.charCodeAt(0);

  if (code === 13) { // Enter key
    executeCommand(currentInput);
    currentInput = '';
    prompt();
  } else if (code === 127) { // Backspace
    if (currentInput.length > 0) {
      currentInput = currentInput.slice(0, -1);
      term.write('\b \b');
    }
  } else if (code >= 32) { // Printable characters
    currentInput += data;
    term.write(data);
  } else if (code === 27) { // Escape key
    // Handle escape sequences if needed
  }
});

async function init() {
  // Initialize terminal
  //print ./assets/miao.txt
  await fetch('./assets/miao.txt')
    .then(response => response.text())
    .then(text => {
      text.split(/\r?\n/).forEach(line => term.writeln(line));
    })
    .catch(error => {
      term.writeln('Error loading file: ' + error);
    });
  term.writeln(`Welcome to ${colors.red}MiaoShell${colors.reset} - A Useless Terminal!`);
  term.writeln(`Type ${colors.yellow}help${colors.reset} to see available commands.`);
  prompt();
};

init().catch(err => {
  console.error('Error initializing terminal:', err);
  term.writeln('Error initializing terminal. Check console for details.');
});
