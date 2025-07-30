//script.js
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import '@xterm/xterm/css/xterm.css';


import * as vfs from './commands/vfs.js'; // Import all VFS commands
import * as jsC from './commands/js.js'; // Import JavaScript commands

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

var term = new Terminal({
  cursorBlink: true,
  cursorStyle: 'block',
  fontFamily: 'monospace',
  fontSize: 14,
  theme: {
    //nice cool theme
    foreground: '#ffffff',
    background: '#181826ff',
    cursor: '#ffffff',
    selection: '#44475a',
    black: '#282a36',
    red: '#ff5555',
    green: '#50fa7b',
    yellow: '#f1fa8c',
    blue: '#bd93f9',
    magenta: '#ff79c6',
    cyan: '#8be9fd',
    white: '#f8f8f2',
    brightBlack: '#6272a4',
    brightRed: '#ff6e6e',
    brightGreen: '#69ff94',
    brightYellow: '#ffffa5',
    brightBlue: '#d6acff',
    brightMagenta: '#ff92df',
    brightCyan: '#a4ffff',
    brightWhite: '#ffffff'
  }
});
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
let commandHistory = [];
let historyIndex = -1;

// Load VFS on startup
vfs.loadVFS();

// Available commands - non-VFS commands only
const commands = {
  help: async (term) => {
    await fetch('./assets/help.txt')
      .then(response => {
        if (response.status === 200) {
          return response.text();
        } else {
          throw new Error('HTTP ' + response.status);
        }
      })
      .then(text => {
        text.split(/\r?\n/).forEach(line => term.writeln(line));
      })
      .catch(error => {
        term.writeln('Error loading file: ' + error);
      });
  },
  clear: (term) => {
    setTimeout(() => {
      term.clear();
    }, 0);
  },
  echo: (term, args) => {
    term.writeln('\r\n' + args.join(' '));
  },
  date: (term) => {
    term.writeln('\r\n' + new Date().toString());
  },
  about: (term) => {
    term.writeln('\r\n' + colors.bold + 'MiaoShell' + colors.reset + ' - A Useless Terminal');
    term.writeln('Version: 1.0.0');
    term.writeln('https://github.com/daniel4-scratch/miaoshell');
  },
  ...vfs.commands, ...jsC.commands
};

function executeCommand(input) {
  const parts = input.trim().split(' ');
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  if (command === '') {
    return;
  }

  // Add command to history if it's not empty and not a duplicate of the last command
  if (input.trim() && (commandHistory.length === 0 || commandHistory[commandHistory.length - 1] !== input.trim())) {
    commandHistory.push(input.trim());
  }
  historyIndex = -1; // Reset history index

  if (commands[command]) {
    const result = commands[command](term, args);
    // If the command returns a promise, wait for it to complete
    if (result instanceof Promise) {
      result.then(() => {
        vfs.saveVFS(); // Auto-save after each VFS command
        prompt();
      }).catch(error => {
        term.writeln('\r\nCommand error: ' + error.message);
        prompt();
      });
    } else {
      // For non-async commands, show prompt immediately
      vfs.saveVFS(); // Auto-save after each VFS command
      prompt();
    }
  } else {
    term.writeln('\r\nCommand not found: ' + command);
    term.writeln('Type "help" for available commands.');
    prompt();
  }
}

function prompt() {
  const displayPath = vfs.getCwdPath() === '/' ? '~' : vfs.getCwdPath();
  term.write(`\r\n${colors.green}user@miaoshell${colors.reset}:${colors.blue}${displayPath}${colors.reset}$ `);
}

// Handle terminal input
term.onKey(e => {
  const { key, domEvent } = e;
  if (domEvent.key === 'Enter') {
    executeCommand(currentInput);
    currentInput = '';
    cursorPosition = 0; // Reset cursor position
  } else if (domEvent.key === 'Backspace') {
    if (currentInput.length > 0 && cursorPosition > 0) {
      // Remove character at cursor position
      currentInput = currentInput.slice(0, cursorPosition - 1) + currentInput.slice(cursorPosition);
      cursorPosition--;
      
      // Move cursor back one position
      term.write('\x1b[1D');
      // Delete character and shift remaining text left
      term.write('\x1b[1P'); // Delete character at cursor position
    }
  } else if (domEvent.key === 'ArrowLeft') {
    // Only move left if we're not at the beginning of the input
    if (cursorPosition > 0) {
      cursorPosition--;
      term.write('\x1b[1D');
    }
  } else if (domEvent.key === 'ArrowRight') {
    // Only move right if we're not at the end of the input
    if (cursorPosition < currentInput.length) {
      cursorPosition++;
      term.write('\x1b[1C');
    }
  }else if (domEvent.key === 'ArrowUp') {
    // Navigate up in command history
    if (commandHistory.length > 0) {
      if (historyIndex === -1) {
        historyIndex = commandHistory.length - 1;
      } else if (historyIndex > 0) {
        historyIndex--;
      }
      
      // Clear current input and replace with history command
      term.write('\x1b[2K'); // Clear entire line
      term.write('\r'); // Move cursor to beginning
      //move cursor up
      term.write('\x1b[1A'); // Move cursor up one line
      prompt();
      currentInput = commandHistory[historyIndex];
      cursorPosition = currentInput.length; // Set cursor to end of input
      term.write(currentInput);
    }
  } else if (domEvent.key === 'ArrowDown') {
    // Navigate down in command history
    if (commandHistory.length > 0 && historyIndex !== -1) {
      if (historyIndex < commandHistory.length - 1) {
        historyIndex++;
        // Clear current input and replace with history command
        term.write('\x1b[2K'); // Clear entire line
        term.write('\r'); // Move cursor to beginning
        term.write('\x1b[1A'); // Move cursor up one line
        prompt();
        currentInput = commandHistory[historyIndex];
        cursorPosition = currentInput.length; // Set cursor to end of input
        term.write(currentInput);
      } else {
        // Go to empty input (beyond history)
        historyIndex = -1;
        term.write('\x1b[2K'); // Clear entire line
        term.write('\r'); // Move cursor to beginning
        term.write('\x1b[1A'); // Move cursor up one line
        prompt();
        currentInput = '';
        cursorPosition = 0; // Reset cursor position
      }
    }
  } else if (typeof key === 'string' && key.length === 1) {
    // Insert character at cursor position
    currentInput = currentInput.slice(0, cursorPosition) + key + currentInput.slice(cursorPosition);
    
    // Insert character mode - push existing characters to the right
    term.write('\x1b[@'); // Insert blank character at cursor position
    term.write(key); // Write the character
    cursorPosition++; // Update cursor position
  }
});

async function init() {
  // Initialize terminal
  //print /assets/miao.txt
  await fetch('./assets/miao.txt')
    .then(response => {
      if (response.status === 200) {
        return response.text();
      } else {
        throw new Error('HTTP ' + response.status);
      }
    })
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
  term.writeln(`${colors.red}Error initializing terminal. Check console for details.${colors.reset}`);
});
