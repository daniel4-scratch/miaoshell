//script.js
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

var term = new Terminal();
term.open(document.getElementById('terminal'));

let fitAddon = new FitAddon();
term.loadAddon(fitAddon);
fitAddon.fit();

// Resize the terminal when the window resizes
window.addEventListener('resize', () => {
  fitAddon.fit();
});

let currentInput = '';
let currentLine = '';
let cursorPosition = 0;

// Available commands
const commands = {
  help: () => {
    term.writeln('\r\nAvailable commands:');
    term.writeln('  help     - Show this help message');
    term.writeln('  clear    - Clear the terminal');
    term.writeln('  echo     - Echo back your message');
    term.writeln('  date     - Show current date and time')
  },
  clear: () => {
    term.clear();
  },
  echo: (args) => {
    term.writeln('\r\n' + args.join(' '));
  },
  date: () => {
    term.writeln('\r\n' + new Date().toString());
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
  term.write('\r\n\x1B[1;32muser@xterm-demo\x1B[0m:\x1B[1;34m~\x1B[0m$ ');
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
  }
});

// Initialize terminal
term.writeln('Welcome to \x1B[1;3;31mXterm.js\x1B[0m Terminal Demo!');
term.writeln('Type \x1B[1;33mhelp\x1B[0m to see available commands.');
prompt();
