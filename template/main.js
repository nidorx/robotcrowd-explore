(function () {

   var robots = '__ROBOTS__';
   var searchIndex = '__SEARCH_INDEX__';
   var enums = '__ENUMS__';
   var inputs = '__INPUTS__';

   var ignoreUpdateSetup = false;

   // Modo de trabalho (Otimizacao ou trading)
   var mode;

   // Nome do robo selecionado
   var selected;

   // Valores dos inputs do robô selecionado
   var values = {};
   var robotInputs = {};

   function updateSetup() {
      if (ignoreUpdateSetup) {
         return;
      }
      if (!selected || !mode) {
         document.getElementById('container-setup').style.display = 'none';
         return;
      }

      document.getElementById('output-setup').value =
         Object.keys(values)
            .map(function (key) {
               var value = values[key];
               if (value == '""') {
                  value = '';
               }
               return key + '=' + value;
            })
            .join('\n');

      document.getElementById('container-setup').style.display = '';
   }

   function renderRobotParams() {
      var html = [];
      if (selected && mode) {
         for (var groupLetter in robotInputs) {
            if (!robotInputs.hasOwnProperty(groupLetter)) {
               continue;
            }
            var groupItem = robotInputs[groupLetter];
            var keys = [];
            for (var key in groupItem.itens) {
               if (!groupItem.itens.hasOwnProperty(key)) {
                  continue;
               }
               keys.push(key);
            }

            html.push([
               '<h1>' + groupLetter.replace(/(^[^_]*_)/, '') + ' - ' + groupItem.name + '</h1>',
               '<ul>' + keys.map(function (key) { return renderItem(groupItem.itens[key]); }).join('') + '</ul>'
            ].join(''));
         }
      }

      document.getElementById('conteudo-formulario').innerHTML = html.join('');
   }

   function renderElement(type, name, value, prefix, onChange, attributes) {
      var nameIdOnChange = 'id="' + prefix + '-' + name + '" name="' + prefix + '-' + name + '" onchange="' + onChange + '(this)" ' + (attributes || '');
      switch (type) {
         case 'char':
         case 'short':
         case 'int':
         case 'long':
         case 'uchar':
         case 'ushort':
         case 'uint':
         case 'ulong':
         case 'color':     // @TODO: Criar seletor de cores 
         case 'datetime':  // @TODO: Criar datepicker
            return '<input type="number" ' + nameIdOnChange + ' value="' + value + '"/>';

         case 'double':
         case 'float':
            return '<input type="number" ' + nameIdOnChange + ' value="' + value + '" step="0.01"/>';

         case 'string':
            return '<input   type="text" ' + nameIdOnChange + ' value="' + value + '" maxlength="64"/>';

         case 'bool':
            return '<input type="checkbox" ' + nameIdOnChange + ' ' + (('' + value).toUpperCase() === 'TRUE' ? 'checked="checked"' : '') + ' />';

         default:
            // enum
            if (!enums.hasOwnProperty(type)) {
               throw new Error('Tipo de dado não documentado: ' + type);
            }

            var keysEnum = [];
            var labelsEnum = [];

            if (!Number.isNaN(Number.parseInt(value))) {
               // Tratamento para conversão automática, quando o valor é o índice do item do enum
               value = Number.parseInt(value);
            }

            var i = 0;
            for (var key in enums[type]) {
               if (!enums[type].hasOwnProperty(key)) {
                  continue;
               }

               if (value === key) {
                  // conversão automática do valor para o índice
                  value = i;
               }
               keysEnum.push(i);
               labelsEnum[i] = enums[type][key];
               i++;
            }

            return [
               '<select ' + nameIdOnChange + ' data-enum-type="' + type + '">',
               keysEnum.map(function (key, i) {
                  if (key === value) {
                     return '<option value="' + key + '" selected="selected">' + labelsEnum[i] + '</option>';
                  } else {
                     return '<option value="' + key + '">' + labelsEnum[i] + '</option>';
                  }
               }).join(''),
               '</select>'
            ].join('')
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

   /**
    * Obtém o valor padrão do item
    */
   function getItemDefaultValue(item) {
      var value = item.value;
      if (mode === 'otimizacao' && item.type !== 'string' && item.type !== 'color' && item.type !== 'datetime') {
         // String e color não possuem otimização
         // Não faz sentido optimização de datetime
         var startValue;
         var stepValue;
         var stopValue;
         var startValueEl;
         var stepValueEl;
         var stopValueEl;
         switch (item.type) {
            case 'char':
            case 'short':
            case 'int':
            case 'long':
            case 'uchar':
            case 'ushort':
            case 'uint':
            case 'ulong':
               startValue = Number.parseInt(item.value);
               if (Number.isNaN(startValue)) {
                  startValue = 1;
               }
               stepValue = 1;
               stopValue = Math.max(1, startValue) * 10;
               break;

            case 'double':
            case 'float':
               startValue = Number.parseFloat(item.value);
               if (Number.isNaN(startValue)) {
                  startValue = 1.0;
               }
               stepValue = startValue / 10;
               stopValue = startValue * 10;
               break;

            case 'bool':
               startValue = 'false';
               stepValue = 0;
               stopValue = 'true';
               break;

            default:
               // enum
               if (!enums.hasOwnProperty(item.type)) {
                  throw new Error('Tipo de dado não documentado: ' + item.type);
               }

               // Obtém o valor correto, de acordo com o tipo de setup
               value = getEnumValue(item.type, value);

               startValue = 0;
               stepValue = 0;
               stopValue = Object.keys(enums[item.type]).length - 1;
         }

         return [
            value,
            startValue,
            stepValue,
            stopValue,
            'N'
         ].join('||');
      }

      return value;
   }

   function renderItem(item) {
      var keys = [];
      for (var key in item.itens) {
         if (!item.itens.hasOwnProperty(key)) {
            continue;
         }
         keys.push(key);
      }

      if (item.type) {
         var defaultValue = getItemDefaultValue(item);
         values[item.name] = defaultValue;
         var extras = '';
         if (mode === 'otimizacao' && item.type !== 'string' && item.type !== 'color' && item.type !== 'datetime') {
            var parts = defaultValue.split('||');
            var startValue = parts[1];
            var stepValue = parts[2];
            var stopValue = parts[3];
            var startValueEl;
            var stepValueEl;
            var stopValueEl;
            switch (item.type) {
               case 'char':
               case 'short':
               case 'int':
               case 'long':
               case 'uchar':
               case 'ushort':
               case 'uint':
               case 'ulong':

                  startValueEl = renderElement(item.type, item.name, startValue, 'start', 'onChangeOptimization', 'class="first"');
                  stepValueEl = renderElement('int', item.name, stepValue, 'step', 'onChangeOptimization', 'class="step"');
                  stopValueEl = renderElement(item.type, item.name, stopValue, 'stop', 'onChangeOptimization', 'class="last"');
                  break;

               case 'double':
               case 'float':

                  startValueEl = renderElement(item.type, item.name, startValue, 'start', 'onChangeOptimization', 'class="first"');
                  stepValueEl = renderElement('double', item.name, stepValue, 'step', 'onChangeOptimization', 'class="step"');
                  stopValueEl = renderElement(item.type, item.name, stopValue, 'stop', 'onChangeOptimization', 'class="last"');
                  break;

               case 'bool':

                  startValueEl = renderElement('string', item.name, startValue, 'start', 'onChangeOptimization', 'class="first" disabled');
                  stepValueEl = renderElement('int', item.name, stepValue, 'step', 'onChangeOptimization',
                     'class="step" disabled style="padding: 0; max-width: 1px; border-left: 0;"');
                  stopValueEl = renderElement('string', item.name, stopValue, 'stop', 'onChangeOptimization', 'class="last" disabled');
                  break;

               default:
                  // enum

                  startValueEl = renderElement(item.type, item.name, startValue, 'start', 'onChangeOptimization', 'class="first"');
                  stepValueEl = renderElement('int', item.name, stepValue, 'step', 'onChangeOptimization',
                     'class="step" disabled style="padding: 0; max-width: 1px; border-left: 0;"');
                  stopValueEl = renderElement(item.type, item.name, stopValue, 'stop', 'onChangeOptimization', 'class="last"');
            }

            extras = [
               '<div class="grupo-otimizacao">',
               startValueEl,
               stepValueEl,
               stopValueEl,
               // 
               renderElement('bool', item.name, 'false', 'optimize', 'onChangeOptimization', 'class="optimize"'),
               '</div>'
            ].join('');
         }

         return [
            '<li id="input-' + item.name + '-parent" default-value="' + defaultValue + '">',
            '   <div class="input-container" title="' + item.descriptionOrig + '">',
            '      <label for="input-' + item.name + '"><span>' + item.description + '</span> </label>',
            '      <div style="display: flex; justify-content: flex-end;">',
            renderElement(item.type, item.name, item.value, 'input', 'onChangeInput', 'class="input-value"'),
            extras,
            '      </div>',
            '   </div>',

            keys.length > 0
               ? '<ul>' + keys.map(function (key) { return renderItem(item.itens[key]); }).join('') + '</ul>'
               : '',

            '</li>',
         ].join('');

      } else {

         return [
            '<li class="sub-grupo">',
            '  <label><span>' + item.description + '</span> </label>',
            keys.length > 0
               ? '<ul>' + keys.map(function (key) { return renderItem(item.itens[key]); }).join('') + '</ul>'
               : '',
            '</li>',
         ].join('');
      }
   }

   function downloadSetup() {
      var element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(document.getElementById('output-setup').value));
      element.setAttribute('download', selected + '.set');

      element.style.display = 'none';
      document.body.appendChild(element);

      element.click();
      document.body.removeChild(element);
   }

   /**
    * Faz o carregamento de um arquivo de setup
    */
   function loadSetup(event) {
      values = {};

      var input = event.target;

      var reader = new FileReader();
      reader.onload = function () {
         ignoreUpdateSetup = true;

         // Faz o processamento do arquivo de SET
         var text = reader.result;
         var lines = text.split('\n');

         for (var i = 0, l = lines.length; i < l; i++) {
            var line = lines[i];
            if (line.indexOf(';') === 0) {
               // Comentário
               continue;
            }
            var parts = line.match(/^([^=]+)=(.*)/);
            if (parts) {
               var key = parts[1];
               var inputEl = document.getElementById('input-' + key);

               if (!inputEl) {
                  // Parametro não existe para o robo atual
                  continue;
               }

               var value = parts[2];
               var startEl = document.getElementById('start-' + key);
               if (mode === 'otimizacao' && startEl) {
                  // item.type !== 'string' && item.type !== 'color' && item.type !== 'datetime'
                  var partsOptimization = value.split('||');
                  var defaultValues = document.getElementById('input-' + key + '-parent').attributes['default-value'].value.split('||');

                  // Se a entrada não tiver valores, considera o valor default para o campo
                  var inputValue = partsOptimization[0] !== undefined ? partsOptimization[0] : defaultValues[0];
                  var startValue = partsOptimization[1] !== undefined ? partsOptimization[1] : defaultValues[1];
                  var stepValue = partsOptimization[2] !== undefined ? partsOptimization[2] : defaultValues[2];
                  var stopValue = partsOptimization[3] !== undefined ? partsOptimization[3] : defaultValues[3];
                  var optimizeValue = partsOptimization[4] !== undefined ? partsOptimization[4] : defaultValues[4];

                  setElementValue(inputEl, inputValue);
                  setElementValue(startEl, startValue);
                  setElementValue(document.getElementById('step-' + key), stepValue);
                  setElementValue(document.getElementById('stop-' + key), stopValue);
                  setElementValue(document.getElementById('optimize-' + key), optimizeValue == 'Y' ? 'true' : 'false');
               } else {
                  value = value.split('||')[0];
                  setElementValue(inputEl, value);
               }

               onChangeInput(inputEl);
            }
         }

         // Substitui o botão de seleção, afim de permitir o upload do mesmo arquivo novamente
         document.getElementById('load-setup-label').innerHTML
            = 'Carregar um Setup <input type="file" id="load-setup" accept=".set" onchange="loadSetup(event)" style="display:none;">';

         // Atualiza conteúdo
         ignoreUpdateSetup = false;
         updateSetup();
      };

      reader.readAsText(input.files[0]);
   };

   /**
    * Verifica se o elemento está com o valor default, adicionado um destaque na linha caso tenha alteração
    */
   function checkDefaultValue(elID, value) {
      // Valor diferente do padrão?
      var elParent = document.getElementById(elID + '-parent');
      if (value !== elParent.attributes['default-value'].value) {
         elParent.className = 'ativo';
      } else {
         elParent.className = '';
      }
   }

   function setElementValue(el, value) {
      if (el.nodeName === 'INPUT') {
         if (el.type === 'checkbox') {
            el.checked = (value === 'true');
         } else {
            el.value = value;
         }
      } else if (el.nodeName === 'SELECT') {
         value = getEnumValue(el.attributes['data-enum-type'].value, value);
         value = '' + value;
         for (var b = 0; b < el.options.length; b++) {
            if (el.options[b].value === value) {
               el.options[b].selected = true;
               break;
            }
         }
      }
   }

   /**
    * Obtém o valor de um elemento do formulário (input, checkbox, select)
    */
   function getElementValue(el) {
      var value = '';
      if (el.nodeName.toUpperCase() === 'INPUT') {
         if (el.type === 'checkbox') {
            value = el.checked;
         } else {
            value = el.value;
         }
      } else if (el.nodeName.toUpperCase() === 'SELECT') {
         // Enum, no modo otimização, salva o índice do item do enum
         value = el.options[el.selectedIndex].value;
      }
      return '' + value;
   }

   /**
    * Invocado ao alterar o campo INPUT (entrada do robo)
    */
   function onChangeInput(el) {
      var name = el.attributes.name.value.replace(/^input-/, '');
      var value = getElementValue(el);

      if (mode === 'otimizacao') {
         // Salva os valores inicio, passo, fim e ativado
         var startEl = document.getElementById('start-' + name);
         if (startEl) {
            var optimizeEl = document.getElementById('optimize-' + name);
            var optimize = (getElementValue(optimizeEl) === 'true' ? 'Y' : 'N');
            // Se existir o elemento, significa que o tipo de dado aceita range de parametrização
            value = value + '||' + getElementValue(startEl);
            value = value + '||' + getElementValue(document.getElementById('step-' + name));
            value = value + '||' + getElementValue(document.getElementById('stop-' + name));
            value = value + '||' + optimize;

            if (optimize === 'Y') {
               optimizeEl.parentElement.className = 'grupo-otimizacao ativo';
            } else {
               optimizeEl.parentElement.className = 'grupo-otimizacao ';
            }
         }
      }

      values[name] = value;

      checkDefaultValue(el.attributes.id.value, values[name]);

      updateSetup();
   }

   function onChangeOptimization(el) {
      var name = el.attributes.name.value.replace(/^(start|step|stop|optimize)-/, '');
      onChangeInput(document.getElementById('input-' + name));
   }


   function onChangeRobot() {
      var select = document.getElementById('robo-investidor');
      values = {};
      selected = select.options[select.selectedIndex].value;
      if (selected == '') {
         selected = null;
      }

      robotInputs = {};
      if (selected) {
         // Quais coonfigurações serão exibidas para esse Robo?
         var groups = select.options[select.selectedIndex].attributes['data-configs'].value.split(',');
         for (var a = 0, l = groups.length; a < l; a++) {
            var group = groups[a];
            if (inputs.hasOwnProperty(group)) {
               robotInputs[group] = inputs[group];
            }
         }
      }

      renderRobotParams();
      updateSetup();
   }

   function onChangeMode() {
      var select = document.getElementById('tipo-setup');
      mode = select.options[select.selectedIndex].value;
      if (mode == '') {
         document.body.className = '';
         mode = null;
      } else {
         document.body.className = 'modo-' + mode;
      }

      renderRobotParams();
      updateSetup();
   }

   function filtrarRobos(texto) {
      if (filtrarRobos.timeoutID) {
         clearTimeout(filtrarRobos.timeoutID);
      }
      if (texto.length < 3) {
         // Exibe todos os robos
         return;
      }


      filtrarRobos.timeoutID = setTimeout(function () {
         var searchWords = texto
            // Remove acentuação
            .latinise()
            .replace(/\n+/g, ' ')
            // remove caracteres especiais
            .replace(/[^a-z0-9\s]/gi, '')
            .toLowerCase()
            .split(' ')
            .filter(function(w) {
               return w !== '' && w !== 'undefined' && w.length > 2;
            });

            

            for (var word in searchIndex) {
               if (!searchIndex.hasOwnProperty(word)) {
                  continue;
               }
               for(var i = 0; i < searchWords.length; i++){
                  if(word.indexOf(searchWords[i]) >= 0){
                     console.log('word', word, searchIndex[word]);
                  }
               }
            }

         console.log(searchWords);
      }, 250);
   }

   window.loadSetup = loadSetup;
   window.downloadSetup = downloadSetup;

   window.onChangeMode = onChangeMode;
   window.onChangeRobot = onChangeRobot;

   window.onChangeInput = onChangeInput;
   window.onChangeOptimization = onChangeOptimization;

   window.filtrarRobos = filtrarRobos;

   updateSetup();
})();