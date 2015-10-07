var svn = [
//   "bg",
//   "bn-IN",
//   "br",
//   "cs",
//   "cy",
//   "da",
//  "de", filed
//   "dsb",
//   "eo",
//   "es",
//   "es-CL",
//   "es-MX",
//  "fr", filed
//   "fy-NL",
//   "ga-IE",
//   "gd",
//   "gl",
//   "hsb",
//   "id",
//   "is",
//  "it", filed
//   "ja",
//   "km",
//   "ko",
//   "lo",
//   "lt",
//   "lv",
//   "ms",
//   "my",
//   "nb-NO",
//   "nl",
//   "nn-NO",
//   "pl",
//   "pt-BR",
//   "pt-PT",
//   "ro",
//   "ru",
//   "sk",
//  "sl", filed
//   "son",
//  "sv-SE",
//   "th",
//   "tl",
//   "tr",
//  "uk",
//  "uz",
//  "zh-CN",
//  "zh-TW"
];

$.getJSON('https://bugzilla.mozilla.org/rest/product/Mozilla%20Localizations', {
    include_fields: 'components.name'
}).then(fillBugs);

var languages = new Map();

function fillBugs(data) {
    //markKnown();
    var target = $("#locales");
    var enabled = new Set(svn);
    data.products[0].components.forEach(function(component) {
        var parts = component.name.split(" / ");
        if (parts.length !== 2) return;
        var locale = parts[0];
        var lang = parts[1];
        languages.set(locale, lang);
        var div = $('<div>');
        $('<input>')
            .attr('type', 'checkbox')
            .attr('checked', enabled.has(locale))
            .attr('id', 'loc_' + locale)
            .attr('name', 'locale')
            .attr('value', locale)
            .appendTo(div);
        div.append($('<label>')
            .attr('for', 'loc_' + locale)
            .attr('title', lang)
            .text(locale));
        target.append(div);
    });
}

function file() {
    console.log('should do stuff')
    var locs = new FormData(document.forms.locales).getAll('locale');
    $("#progress").css("display", "block");
    $("#total").text(locs.length);
    var filed = [];
    var count = $("#count").text(filed.length);
    var template = new FormData(document.forms.template);
    var tracker = template.get('blocks');
    function nextBug() {
        if (!locs.length) {
            $("#buglist").text(filed.join(', '));
            console.log('done');
            return;
        }
        var loc = locs.shift();
        var lang = languages.get(loc);
        var data = {
            product: "Mozilla Localizations",
            component: loc + " / " + lang,
            cc: ['jbeatty@mozilla.com'],
            version: 'unspecified',
        };
        function expand(s) {
            return s.replace('{ loc }', loc).replace('{ lang }', lang);
        }
        data.summary = expand(template.get('summary'));
        data['description'] = expand(template.get('description'));
        data.api_key = template.get('api_key');
        $.ajax({
            type: 'POST',
            url: 'https://bugzilla.mozilla.org/rest/bug',
            data: data,
            traditional: true,
            dataType: 'json'
        })
            .done(function(data) {
                filed.push(data.id);
                count.text(filed.length);
                nextBug();
            })
            .fail(function(jqXHR, textstatus) {
                console.log(textstatus, jqXHR, 'failed');
            });
    }
    nextBug();
}