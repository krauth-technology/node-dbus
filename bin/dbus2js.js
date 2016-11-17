#!/usr/bin/env node

var xml2js = require('xml2js');
var argv = require('optimist')
    .boolean(['server'])
    .argv;

function die(err) {
    console.log(err);
    process.exit(-1);
}

function getXML(callback) {
    var fs = require('fs');
    fs.readFile(argv.xml, {}, callback);
}

if (!argv.server) {
    getXML(function(err, xml) {

      if (err)
          die(err);
  
      var output = [];

      var parser = new xml2js.Parser({explicitArray: true});
      parser.parseString(xml, function (err, result) {
          if (err) die(err);

          var i, m, ifaceName, method, signal, iface, a, arg, signature;
          var ifaces = result['interface'];
          for (i=0; i < ifaces.length; ++i) {
              iface = ifaces[i];
              ifaceName = iface['@'].name;

              output.push('module.exports[\'' + ifaceName + '\'] = function(bus, destination, path) {');
              output.push('    this.addListener = this.on = function(signame, callback) {');
                                   //TODO: add path and interface to path
              output.push('        bus.addMatch(\'type=\\\'signal\\\',member=\\\'\' + signame + \'\\\'\', function(err) {');
              output.push('            if (err) throw new Error(err);');
              output.push('        });');
              output.push('        var signalFullName = bus.mangle(path, \'' + ifaceName + '\', signame);');
              output.push('        bus.signals.on(signalFullName, function(messageBody) {');
              output.push('             callback.apply(null, messageBody);');
              output.push('        });');
              output.push('    };');
                
              for (m=0; iface.method && m < iface.method.length; ++m)
              {
                  method = iface.method[m];
                  signature = '';
                  var name = method['@'].name;
                  
                  var decl = '    this.' + name + ' = function(';
                  var params = [];
                  for (a=0; method.arg && a < method.arg.length; ++a) {
                      arg = method.arg[a]['@'];
                      if (arg.direction === 'in') {
                          decl += arg.name + ', ';
                          params.push(arg.name);
                          signature += arg.type;
                      }
                  }
                  decl += 'callback) {';
                  output.push(decl);
                  output.push('        bus.invoke({');
                  output.push('            \'destination\': destination,');
                  output.push('            \'path\': path,');
                  output.push('            \'interface\': \'' + ifaceName + '\',');
                  if (params != '') {
                      output.push('            \'body\': [' + params.join(', ') + '], ');
                      output.push('            \'signature\': \'' + signature + '\',');
                  }
                  output.push('            \'member\': \'' + name + '\'');
                  output.push('        }, callback);');
                  output.push('    };');
              }
              output.push('};');
          }
          console.log(output.join('\n'));
      });
    });
}
