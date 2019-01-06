const fs = require('fs');
const https = require('https');
const querystring = require('querystring');

// Gerar conteúdo minificado?
const MINIFY = true;

// Todos os enums documentados
var enums = {};

// Registra os enums não usados
var enumsNotUsed = [];

// Inputs são agrupados por LETRA, conforme a documentação do robo
// Inputs de robos seguem o padrão LETRA.NUMERO
// Ex. input = { F:{ name: 'LIMITES DE OPERACAO', itens: [ { name: 'inMaxDayLoss', type:'double', value:'0.0', description: 'Perda maxima aceitavel no dia (Zero ilimitado)' } ] }}
// Um item pode ter subitens, respeitando a numeraçaõ da documentação
var inputs = {};

/*
Documentação de todos os parametros disponível para todos os robos.

Esse item deve ser preenchido usando o proprio codigo fonte dos robos , afim de facilitar a evoluçao da documentação

Aqui deve entrar ENUMS e INPUTS
*/
parseDocs(fs.readFileSync(__dirname + '/docs.txt') + '', '');
parseDocs(fs.readFileSync(__dirname + '/docs_gl.txt') + '', 'GL_');

// Gera o index.html
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
   var html = fs.readFileSync(__dirname + '/template.html') + '';

   html = html
      .replace("'__ENUMS__'", JSON.stringify(enums))
      .replace("'__INPUTS__'", JSON.stringify(inputs));

   if(MINIFY){
      minifyHTML(html, function (htmlMinified) {
         fs.writeFileSync(__dirname + '/RobotCrowd-Explorer.html', htmlMinified);
      });
   }else {
      fs.writeFileSync(__dirname + '/RobotCrowd-Explorer.html', html);
   }

}

function minifyHTML(html, callback) {
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
 * 
 * @param {*} docs 
 * @param {*} prefix Permite prefixar os Grupos (Usado nos robos GL)
 */
function parseDocs(docs, prefix) {
   prefix = prefix || '';

   var lines = docs.split('\n');

   var enumCurrent;

   for (var i = 0; i < lines.length; i++) {
      var line = lines[i].replace(/(^\s+)|(\s+$)/g, '');

      // Inicio de ENUM
      if (line.indexOf('enum ') === 0) {
         var enumName = prefix + line.replace(/enum \s*([^{\s]+).*/, '$1');
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
                                          .replace(/[>]/g,'&gt;')
                                          .replace(/[<]/g,'&lt;')
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
            var inputDefault = (matchInput[3]||'').replace(/(^")|("$)/g, '').replace(/(^\s+)|(\s+$)/g, ''); // Remove aspas (SE HOUVER) + TRIM;
            var inputDescriptionOrig = (matchInput[5] || inputName).replace(/([=])/g, '').replace(/(^\s+)|(\s+$)/g, '');; // remove "====" de descrição + TRIM
            var matchGroupDescri = inputDescriptionOrig.match(/^([A-Z])\.([\d.]*)\s+(.*)/);

            if (!matchGroupDescri) {
               console.error('INPUT INVÁLIDO', '"' + inputDescriptionOrig + '"', matchGroupDescri);
               continue;
            }

            var groupLetter = matchGroupDescri[1];
            var groupPathNu = matchGroupDescri[2].replace(/\.$/g, ''); // Caminho do item (numero)
            var inputDescription = matchGroupDescri[3];


            if ((inputName.indexOf('inDesc') === 0 && groupLetter !== 'H') || inputName.indexOf('inDescFilter1') === 0) {
               // Início de novo grupo de entrada (Ignora agrupamento de filtros. Ex. "H.07. Filtro de Media Movel 1")

               var groupItem = {
                  name: inputDescription,
                  descriptionOrig: inputDescriptionOrig,
                  itens: {}
               };

               if (groupLetter === 'R' || groupLetter === 'S') {
                  // Input específico do robo
                  groupLetter = groupLetter + '.' + groupPathNu
               }

               groupLetter = prefix + groupLetter;

               inputs[groupLetter] = groupItem;
            } else {

               var PRIMITIVES = ['char', 'short', 'int', 'long', 'uchar', 'ushort', 'uint', 'ulong', 'color', 'datetime', 'double', 'float', 'string', 'bool'];
               if(PRIMITIVES.indexOf(inputType) < 0){
                  // É um enum, deve usar o prefixo, se o enum existir
                  if(enums.hasOwnProperty(prefix + inputType)){
                     inputType = prefix + inputType;                  
                  }

                  if(!enums.hasOwnProperty(inputType)) {
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
                  description: inputDescription,
                  descriptionOrig: inputDescriptionOrig,
                  itens: {}
               };
               // Obtem o caminho do item
               var intemPath = groupPathNu.split('.');

               if (groupLetter === 'R' || groupLetter === 'S') {
                  // Input específico do robo
                  groupLetter = groupLetter + '.' + intemPath.shift()
               }

               groupLetter = prefix + groupLetter;

               // Subgrupo descritivos
               if (inputName.indexOf('inDesc') === 0) {
                  inputs[groupLetter].itens[ '_' + intemPath[0]] = {
                     name: inputDescription,
                     description: inputDescription,
                     descriptionOrig: inputDescriptionOrig,
                     itens: {}
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
   if(!Number.isNaN(Number.parseInt(value))){
      // Tratamento para conversão automática, quando o valor é o índice do item do enum
      value = Number.parseInt(value);
   }

   var i = 0;
   for(var key in enums[enumName]){
      if(!enums[enumName].hasOwnProperty(key)){
         continue;
      }

      if(value === key){
         // conversão automática do valor para o índice
         value = i;
         break;
      }
      i++;
   }

   return value;
}
