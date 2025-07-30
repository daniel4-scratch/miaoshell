// curl.js
import * as vfs from './vfs.js';

const curlCommands = {
    help: (term) => {
        term.writeln('\r\nCURL - Command-line tool for transferring data');
        term.writeln('Usage: curl <command> [options]');
        term.writeln('');
        term.writeln('Commands:');
        term.writeln('  help              Show this help message');
        term.writeln('  <url>             Fetch content from URL');
        term.writeln('  <url> > <file>    Fetch content and save to file');
        term.writeln('');
        term.writeln('Examples:');
        term.writeln('  curl https://api.github.com');
        term.writeln('  curl https://example.com > page.html');
        term.writeln('  curl help');
    },
    fetch: async (term, args) => {
        if (args.length === 0) {
            term.writeln('\r\nUsage: curl <url> [> filename]');
            return;
        }
        // Detect > operator for output redirection
        let url = args[0];
        let saveToFile = false;
        let filename = '';
        const gtIndex = args.indexOf('>');
        if (gtIndex !== -1 && args.length > gtIndex + 1) {
            saveToFile = true;
            filename = args[gtIndex + 1];
            url = args.slice(0, gtIndex).join(' ');
        }
        try {
            const response = await fetch(url);
            if (response.ok) {
                const text = await response.text();
                if (saveToFile) {
                    // Save to file in VFS
                    const currentDir = vfs.cwd();
                    currentDir[filename] = text;
                    term.writeln(`\r\nSaved output to ${filename}`);
                } else {
                    term.writeln('\r\n' + text);
                }
            } else {
                throw new Error('HTTP ' + response.status);
            }
        } catch (error) {
            term.writeln(`\r\nError fetching ${url}: ${error.message}`);
        }
    }
};

export const commands = {
    curl: async (term, args) => {
        if (args.length === 0) {
            curlCommands.help(term);
            return;
        }
        
        const firstArg = args[0].toLowerCase();
        
        // Check if it's a help command
        if (firstArg === 'help') {
            curlCommands.help(term);
            return;
        }
        
        // Otherwise, treat it as a fetch command
        await curlCommands.fetch(term, args);
    }
};
