var _ = require('lodash');
var fs = require('fs');

var filename = process.argv[2];

function insertVariables(text, variables) {
    _.forEach(variables, function (value, key) {
        var from = '{{' + key + '}}';
        from = new RegExp(from, 'g');
        text = text.replace(from, String(value));
    });
    return text;
}

function formatTable(lines) {
    lines = _.map(lines.split('\n'), function (line) {
        var tokens = _(line).split('|').map(_.trim).reject(_.isEmpty).value();
        return tokens;
    });
    
    var columnInfo = _.times(lines[1].length, function (num) {
        var formatCell = lines[1][num];
        var alignment = _.endsWith(formatCell, ':') ? (_.startsWith(formatCell, ':') ? 'center' : 'right') : 'left';
        lines[1][num] = _.trim(formatCell, ':');
        return {
            'len':  _(lines).map(function (line) {
                return line[num].length;
            }).max(),
            'align': alignment
        };
    });
        
    var alignmentMap = {
        'left': _.padEnd,
        'right': _.padStart,
        'center': _.pad
    };
    
    return _.map(lines, function (line) {
        line = _.times(columnInfo.length, function (num) {
            var paddingFunc = alignmentMap[columnInfo[num].align];
            return paddingFunc(line[num], columnInfo[num].len);
        }).join(' | ');
        return ['|', line, '|'].join(' ');
    });
}

function isTableLine(line) {
    return line.includes(' | ');
}

function isFormatLine(line) {
    return _(line).split('|').compact().head().includes('---');
}

fs.readFile(filename, 'utf8', function (err, data) {
    if (err) {
        return console.log(err);
    }
    
    var variables = {
        'a': 'hej test'
    };
    
    data = insertVariables(data, variables);
    
    var lines = data.split('\n');
    var output = [];
    var headerLine;
    var tableLines = [];
    
    function formatAndAppendTable() {
        tableLines = formatTable(tableLines.join('\n'), variables);
        output = output.concat(tableLines);
        tableLines = [];
    }
    
    function appendLine(line) {
        if (line) {
            output.push(line);
        }
    }
    
    _.forEach(lines, function (line) {
        if (tableLines.length > 0) {
            if (isTableLine(line)) {
                //console.log('Found table content line:', line);
                tableLines.push(line);
                headerLine = '';
            } else {
                //console.log('Found end of table content:', line);
                formatAndAppendTable();
                headerLine = line;
            }
        } else {
            if (isFormatLine(line)) {
                //console.log('Found table format line:', line);
                tableLines = [headerLine, line];
                headerLine = '';
            } else {
                //console.log('Found non table line or header line:', line);
                appendLine(headerLine);
                headerLine = line;
                tableLines = [];
            }
        }
    });
    if (tableLines.length > 0) { // If content still in buffer -> Flush
        formatAndAppendTable();
    }
    appendLine(headerLine); // If content still in buffer -> Flush
        
    output = output.join('\n');
    
    filename = filename.split('.');
    var extention = filename.pop();
    filename = filename.join('.');
    filename = [filename, '_formatted'].join('');
    filename = [filename, extention].join('.');
    fs.writeFile(filename, output, function (err) {
        if (err) {
            return console.log(err);
        }

        console.log('Formatted table saved to', filename);
    });
});