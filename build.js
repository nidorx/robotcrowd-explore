const fs = require('fs');
const https = require('https');
const querystring = require('querystring');
const buscaBR = require('./libs/buscaBR.js');
require('./libs/latinise.min.js');

// Gerar conteúdo minificado?
const MINIFY = false;


// Registra os enums não usados
var enumsNotUsed = [];

// Todos os enums documentados
var enums = {};

// Inputs são agrupados por LETRA, conforme a documentação do robo
// Inputs de robos seguem o padrão LETRA.NUMERO
// Ex. input = { F:{ name: 'LIMITES DE OPERACAO', itens: [ { name: 'inMaxDayLoss', type:'double', value:'0.0', description: 'Perda maxima aceitavel no dia (Zero ilimitado)' } ] }}
// Um item pode ter subitens, respeitando a numeraçaõ da documentação
var inputs = {};

// Listagem dos robos investidores documentados
var robots = [];

// A documentação do robô é criado aqui, renderizado no HTML com display:none, afim de melhorar o SEO 
var robotsHTMLDocs = [];

// Os cartões como o nome dos robôs já é criado antecipadamente
var robotsHTMLCards = [];

// Indice de palavras relacionado aos robos que possuem essa palavra na documentação
// Usado pelo filtro de pesquisa da funcionalidade
var searchIndex = {};

/*
Documentação de todos os parametros disponível para todos os robos.

Esse item deve ser preenchido usando o proprio codigo fonte dos robos , afim de facilitar a evoluçao da documentação

Aqui deve entrar ENUMS e INPUTS
*/
console.log('-- Geração dos parametros de entrada');
parseEnumsInputs(fs.readFileSync(__dirname + '/docs/params.txt') + '', '');
parseEnumsInputs(fs.readFileSync(__dirname + '/docs/params_gl.txt') + '', 'GL_');

// Tratamento da documentação e indice de busca de robos
console.log('-- Gerando documentação dos robos');
parseRobotsDocs();

// Tratamento da documentação dos parametros de entrada
console.log('-- Gerando documentação dos parametros de entrada');
parseParamsDocs();

// Gera o index.html
console.log('-- Gerando HTML');
generateHtml();


function generateHtml() {
   if (enumsNotUsed.length > 0) {

      console.log('Os seguintes ENUMS não estão sendo usados nos inputs, favor rever a documentação', JSON.stringify(enumsNotUsed));

      // Remove os enums não usados
      enumsNotUsed.forEach(function (key) {
         delete enums[key];
      });
   }


   // Finalmente, gera o arquivo final
   var html = (fs.readFileSync(__dirname + '/template/template.html') + '')
      .replace(
         "/*__JS__*/",
         fs.readFileSync(__dirname + '/libs/latinise.min.js') + ';'
         + fs.readFileSync(__dirname + '/template/main.js') + ''
      )
      .replace("/*__JS__*/", fs.readFileSync(__dirname + '/template/main.js') + '')
      .replace("/*__STYLES__*/", fs.readFileSync(__dirname + '/template/styles.css') + '')
      .replace("<!--__HTML_DOCS__-->", robotsHTMLDocs.join('\n'))
      .replace("<!--__HTML_CARDS__-->", robotsHTMLCards.join('\n'))
      .replace("'__ENUMS__'", JSON.stringify(enums))
      .replace("'__INPUTS__'", JSON.stringify(inputs))
      .replace("'__ROBOTS__'", JSON.stringify(robots))
      .replace("'__SEARCH_INDEX__'", JSON.stringify(searchIndex))
      ;

   if (MINIFY) {
      minifyHTML(html, function (htmlMinified) {
         fs.writeFileSync(__dirname + '/RobotCrowd-Explorer.html', htmlMinified);
      });
   } else {
      fs.writeFileSync(__dirname + '/RobotCrowd-Explorer.html', html);
   }

}

function minifyHTML(html, callback) {
   console.log('   - Gerar HTML minificado');

   var query = querystring.stringify({
      input: html
   });

   var req = https.request(
      {
         method: 'POST',
         hostname: 'html-minifier.com',
         path: '/raw',
      },
      function (resp) {
         // if the statusCode isn't what we expect, get out of here
         if (resp.statusCode !== 200) {
            console.log('StatusCode=' + resp.statusCode);
            return;
         }

         let body = '';
         resp.on('data', chunk => {
            body += chunk.toString();
         });

         resp.on('end', () => {
            callback(body);
         });
      }
   );



   req.on('error', function (err) {
      throw err;
   });
   req.setHeader('Content-Type', 'application/x-www-form-urlencoded');
   req.setHeader('Content-Length', query.length);
   req.end(query, 'utf8');
}

/**
 * Gera documentação dos Robos
 */
function parseRobotsDocs() {

   // Palavras a ignorar na indexação
   var ignoredWords = ''.split('');

   // Obtém a documetação dos parametros a partir dos documentos de texto. 
   var dirents = fs.readdirSync(__dirname + '/docs/robots', { withFileTypes: true });
   dirents.filter(d => d.isFile() && d.name.endsWith('.txt')).forEach((file, robotIndex) => {
      var name = file.name.replace('.txt', '');
      var lines = (fs.readFileSync(__dirname + '/docs/robots/' + file.name) + '').split('\n');
      var title = (lines[0] || '');
      var header = (lines[1] || '');
      var robotDoc = '';
      var robot = {
         name: name
      };
      robots.push(robot);
      for (var i = 2; i < lines.length; i++) {
         robotDoc += '\n' + lines[i].replace(/(^\s+)|(\s+$)/g, '');
      }

      // Gera o conteúdo HTML com a descrição dos robos
      robotsHTMLCards.push([
         '<div class="item">',
         '   <div class="conteudo">',
         '      <a href="#robot-' + robotIndex + '-docs" onClick="selectRobot(' + robotIndex + '); return false;">',
         '         <span>' + title + '</span>',
         '         <i>' + header + '</i>',
         '      </a>',
         '   </div>',
         '</div>'
      ].join(''));

      robotsHTMLDocs.push([
         '<div>',
         '<h1>' + title + '</h1>',
         '<p>',
         (
            robotDoc
               .replace(/(^\s+)|(\s+$)/g, '')
               .replace(/\n+/g, '</p><p>')
               .replace(/!\[([^\]]+)\]/g, '<img src="./assets/$1" />')
               .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
         ),
         '</p>',
         '</div>'
      ].join('\n'));

      // Faz a indexação dos parametros de pesquisa do robo
      `${robot.name} ${robot.title} ${robot.header} ${robotDoc}`
         // Remove acentuação
         .latinise()
         .replace(/\n+/g, ' ')
         // remove caracteres especiais
         .replace(/[^a-z0-9\s]/gi, '')
         .toLowerCase()
         .split(' ')
         .filter(w => {
            return w !== '' && w !== 'undefined' && w.length > 2 && ignoredWords.indexOf(w) < 0;
         })
         .forEach(word => {
            if (!searchIndex.hasOwnProperty(word)) {
               searchIndex[word] = { r: 0, d: [] };
            }
            if (searchIndex[word].d.indexOf(robotIndex) < 0) {
               searchIndex[word].d.push(robotIndex);
            }
         });
   });

   // Gera o peso das palavras, quanto mais específica uma palavra, mais importante é
   var qtdRobots = robots.length;
   for (var word in searchIndex) {
      if (!searchIndex.hasOwnProperty(word)) {
         continue;
      }
      searchIndex[word].r = qtdRobots / searchIndex[word].d.length;
   }
}

/**
 * Faz o carregamento da documentação detalhada dos parametros.
 * 
 * Após o parsing, atualiza a documentação com todos os inputs existentes
 */
function parseParamsDocs() {

   // Documentação dos parametros por índice
   var docs = {};

   // Obtém a documetação dos parametros a partir dos documentos de texto. 
   var dirents = fs.readdirSync(__dirname + '/docs/params', { withFileTypes: true });
   dirents.filter(d => d.isFile() && d.name.endsWith('.txt')).forEach(file => {
      var contextParts = file.name.replace('.txt', '').split('_');
      var context = contextParts.length == 1 ? '' : (contextParts[0] + '_');
      var lines = (fs.readFileSync(__dirname + '/docs/params/' + file.name) + '').split('\n');
      var currentParam;
      for (var i = 0; i < lines.length; i++) {
         var line = lines[i].replace(/(^\s+)|(\s+$)/g, '');

         var match = line.match(/^\[([^]+)\]\s*(.*)/);
         if (match) {
            var docID = context + match[1];
            var description = match[2];

            currentParam = {
               // Permite sobrescrever a descrição do parametro que foi previamente documentado no codigo fonte
               description: description,
               // Conteúdo da ajuda de contexto
               help: ''
            };

            docs[docID] = currentParam;
         } else if (currentParam && line !== '') {
            if (currentParam.help === '') {
               currentParam.help = line;
            } else {
               currentParam.help += '\n' + line;
            }
         }
      }
   });

   // Salva a documentação de todos os paremtros, atualiza os documentos, adicionando os parametros não documentados
   for (var group in inputs) {
      if (!inputs.hasOwnProperty(group)) {
         continue;
      }

      // Abriga o conteúdo da documentação deste grupo
      var fileContent = [];

      var parseParamDocs = (item) => {
         // Parametro possui doucmentação?
         var docID = item.docID;
         var contextDocID = item._context + docID;
         if (docs.hasOwnProperty(contextDocID)) {
            //console.log(`"${docID}"`, docs[docID]);
            item.description = docs[contextDocID].description;
            item.help = docs[contextDocID].help;
         }

         var description = item.description || item.name;
         var content = `[${docID}] ${description}\n`;
         if (item.help && item.help !== '') {
            content += '    ' + item.help.replace(/\n/g, '\n    ') + '\n';

            // Gera o html para o conteúdo
            // ![caminho/da/imagem.png] -> <img src="./assets/caminho/da/imagem.png" />
            // [I'm an inline-style link](https://www.google.com)

            item.help =
               '<p>' + (
                  item.help
                     .replace(/(^\s+)|(\s+$)/g, '')
                     .replace(/\n+/g, '</p><p>')
                     .replace(/!\[([^\]]+)\]/g, '<img src="./assets/$1" />')
                     .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
               )
               + '</p>';
         }

         fileContent.push(content);

         // Remove a variável de marcação
         delete item._context;

         // Atualiza documentação dos atributos relacionados
         for (var key in item.itens) {
            if (!item.itens.hasOwnProperty(key)) {
               continue;
            }
            parseParamDocs(item.itens[key]);
         }
      };

      parseParamDocs(inputs[group]);

      // Finalmente, salva o arquivo de documentação deste grupo de parametros
      fs.writeFileSync(__dirname + '/docs/params/' + group + '.txt', fileContent.join('\n'));
   }
}

/**
 *  Faz o parsing do codigo fonte dos enums e inputs dos robos
 * 
 * @param {*} source 
 * @param {*} context Permite prefixar os Grupos (Usado nos robos GL)
 */
function parseEnumsInputs(source, context) {
   context = context || '';

   var lines = source.split('\n');

   var enumCurrent;

   for (var i = 0; i < lines.length; i++) {
      var line = lines[i].replace(/(^\s+)|(\s+$)/g, '');

      // Inicio de ENUM
      if (line.indexOf('enum ') === 0) {
         var enumName = context + line.replace(/enum \s*([^{\s]+).*/, '$1');
         enumCurrent = {};
         if (enums.hasOwnProperty(enumName)) {
            throw new Error('Enum com nome ' + enumName + ' já foi registrado antes');
         }
         enums[enumName] = enumCurrent;

         enumsNotUsed.push(enumName);
      }

      // Fim de enum
      else if (enumCurrent && line.indexOf('};') === 0) {
         // Finalizou enum atual
         enumCurrent = undefined;
      }

      // Conteúdo do ENUM (opções)
      else if (enumCurrent) {
         // Obtém nome e descrição da opção do enum
         // ex: "PUBLISH_NONE,            // Nao publicar"
         var match = line.match(/^([a-z0-9][a-z0-9_]+)\s*,?\s*(\/\/\s*(.*))?/i);
         if (match) {
            var nameItem = match[1];
            var descItem = match[3] || nameItem;

            // @TODO: Documentar os itens de enum que não possuem
            enumCurrent[nameItem] = descItem
               .replace(/[>]/g, '&gt;')
               .replace(/[<]/g, '&lt;')
               ;
         }
      }

      // Input
      else if (line.indexOf('input ') === 0) {
         // Obtém dados da entrada
         var matchInput = line.match(/^input\s+([^\s]+)\s+([^=\s]+)[=\s]+([^;]+);\s*(\/\/\s*(.*))?/i);
         if (matchInput) {
            var inputType = matchInput[1];
            var inputName = matchInput[2];
            var inputDefault = (matchInput[3] || '').replace(/(^")|("$)/g, '').replace(/(^\s+)|(\s+$)/g, ''); // Remove aspas (SE HOUVER) + TRIM;
            var inputDescriptionOrig = (matchInput[5] || inputName).replace(/([=])/g, '').replace(/(^\s+)|(\s+$)/g, '');; // remove "====" de descrição + TRIM
            var matchGroupDescri = inputDescriptionOrig.match(/^([A-Z])\.([\d.]*)\s+(.*)/);

            if (!matchGroupDescri) {
               console.error('INPUT INVÁLIDO', '"' + inputDescriptionOrig + '"', matchGroupDescri);
               continue;
            }

            var groupLetter = matchGroupDescri[1];
            var groupPathNu = matchGroupDescri[2].replace(/\.$/g, ''); // Caminho do item (numero)
            var inputDescription = matchGroupDescri[3];
            var docID = inputDescriptionOrig.replace(inputDescription, '').replace(/(^\s+)|(\s+$)/g, '');

            if ((inputName.indexOf('inDesc') === 0 && groupLetter !== 'H') || inputName.indexOf('inDescFilter1') === 0) {
               // Início de novo grupo de entrada (Ignora agrupamento de filtros. Ex. "H.07. Filtro de Media Movel 1")

               var groupItem = {
                  // O número do parametro na documentaçao
                  docID: '',
                  name: inputDescription,
                  itens: {}
               };

               if (groupLetter === 'R' || groupLetter === 'S') {
                  // Input específico do robo
                  groupLetter = groupLetter + '.' + groupPathNu
               }

               // Docid de parametros de descrição segue um modelo diferente
               groupItem.docID = groupLetter;

               // TEMP! registra o caminho original do item, usado na documentação dos parametros
               groupItem._context = context;

               groupLetter = context + groupLetter;

               inputs[groupLetter] = groupItem;
            } else {

               var PRIMITIVES = ['char', 'short', 'int', 'long', 'uchar', 'ushort', 'uint', 'ulong', 'color', 'datetime', 'double', 'float', 'string', 'bool'];
               if (PRIMITIVES.indexOf(inputType) < 0) {
                  // É um enum, deve usar o prefixo, se o enum existir
                  if (enums.hasOwnProperty(context + inputType)) {
                     inputType = context + inputType;
                  }

                  if (!enums.hasOwnProperty(inputType)) {
                     throw new Error('Tipo de dado não documentado: ' + inputType);
                  }

                  // Valor do enum é por índice
                  inputDefault = getEnumValue(inputType, inputDefault);
               }

               // Um item de input comum
               var item = {
                  name: inputName,
                  type: inputType,
                  value: inputDefault,
                  docID: docID,
                  description: inputDescription,
                  itens: {},
                  // TEMP! registra o caminho original do item, usado na documentação dos parametros
                  _context: context
               };
               // Obtem o caminho do item
               var intemPath = groupPathNu.split('.');

               if (groupLetter === 'R' || groupLetter === 'S') {
                  // Input específico do robo
                  groupLetter = groupLetter + '.' + intemPath.shift()
               }

               groupLetter = context + groupLetter;

               // Subgrupo descritivos
               if (inputName.indexOf('inDesc') === 0) {
                  inputs[groupLetter].itens['_' + intemPath[0]] = {
                     name: inputDescription,
                     docID: docID,
                     description: inputDescription,
                     itens: {},
                     // TEMP! registra o caminho original do item, usado na documentação dos parametros
                     _context: context
                  };
                  continue;
               }

               // Remove ultimo indice (não usado)
               var inputCurrentIndex = '_' + intemPath.pop();

               var inputCurrent = inputs[groupLetter];
               while (intemPath.length > 0) {
                  var index = intemPath.shift();
                  inputCurrent = inputCurrent.itens['_' + index];
               }

               if (!inputCurrent) {
                  console.error('Item invalido?', item);
                  continue;
               }
               inputCurrent.itens[inputCurrentIndex] = item;

               // Registra enum como usado
               var enumIndex = enumsNotUsed.indexOf(inputType);
               if (enumIndex >= 0) {
                  enumsNotUsed.splice(enumIndex, 1);
               }
            }
         }
      }
   }
}


/**
 * Obtém o valor para o item do enum, seja indice ou nome, de acordo com o modo selecionado
 */
function getEnumValue(enumName, value) {
   if (!Number.isNaN(Number.parseInt(value))) {
      // Tratamento para conversão automática, quando o valor é o índice do item do enum
      value = Number.parseInt(value);
   }

   var i = 0;
   for (var key in enums[enumName]) {
      if (!enums[enumName].hasOwnProperty(key)) {
         continue;
      }

      if (value === key) {
         // conversão automática do valor para o índice
         value = i;
         break;
      }
      i++;
   }

   return value;
}
