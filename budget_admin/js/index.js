(async function(){
    //check authentication before proceedin
    const user = await check_authentication();
    var monthId = "";

    $('#csvForm').on('change','#inputCSVFile', function(){
        const input = this.files[0];
        const reader = new FileReader();
        reader.onload = function (e) {
            const text = e.target.result;
            const data = d3.csvParse(text);
            process_csv_data(data);
        };
        reader.readAsText(input);
    });
    
    function process_csv_data(data){
        let clean_data = [];
        const limit = 1000;
        data.forEach(function(record){
            const item = validate_record(record);
            if(clean_data.length < limit && item!== false) clean_data.push(item);
        })

        if(clean_data.length>0){
            localStorage.setItem(CSV_FILE_NAME,JSON.stringify({
                expiry: (get_time_in_seconds() + DAY_IN_SECONDS),
                data: clean_data
            }));
            window.setTimeout(function(){
                location.href = 'transactions.html';
            },300);
        }
    }// end of save_csv_data

    function validate_record(record){
        const new_record = {
            time: get_record_date(record),
            amount: get_record_amount(record),
            description: get_record_desc(record),
            active: true,
            source: 'local web portal',
            reference: get_record_reference(record)
        }

        if(record.amount > 1000){
            console.log(record);
        }

        if(new_record.time === false || new_record.amount === false) return false;
        return new_record;
    }//end of validate_record

    function get_record_date(record){
        if(!record || typeof(record["Fecha"])!== 'string') return false;
        const date_sections = record["Fecha"].split('/');
        if(date_sections.length != 3) return false;
        try{
            return parseInt(new Date(`${date_sections[2]}-${date_sections[1]}-${date_sections[0]}T00:00:00.000Z`).getTime()/1000);
        }catch(e){
            console.log(`Error converting date ${record["Fecha"]}`);
            return false;
        }
    }//end get_record_date

    function get_record_amount(record){
        if(!record || typeof(record["Importe"])!== 'string' || record["Importe"]=="" || isNaN(record["Importe"].replace(",",""))) return false;
        const amount_str = record["Importe"].replace(",","");
        try{
            return parseFloat(amount_str);
        }catch(e){
            console.log(`Error converting date ${record["Importe"]}`);
            return false;
        }
    }//end get_record_amount

    function get_record_reference(record){
        try{
            return CryptoJS.MD5(JSON.stringify(record)).toString();
        }catch(e){
            console.log('Error generating reference for record');
        }
    }//end of get_record_reference

    function get_record_desc(record){
        var desc = "";
        if('Movimiento' in record){
            desc = sanitize_string(record['Movimiento']);
        }
        if('Más datos' in record){
            const temp = sanitize_string(record['Más datos']);
            if(temp == "") return desc;
            if(desc == ""){
                desc = temp;
            }else{
                desc+= ` | ${temp}`;
            }
        }
        return desc;
    }//end get_record_desc

    function sanitize_string(str){
        if(typeof(str)!= 'string') return "";
        str = str.toLowerCase();
        const subs = {"á": "a", "é": "e","í": "i","ó": "o","ú": "u","ñ": "n"};
        Object.keys(subs).forEach(function(letter){
            str.replace(letter,subs[letter]);
        });
        return str.replace(/[^a-zA-Z0-9]/g, " ");
    }//end of sanitize_string

    // --- fetch already stored data
    async function fetch_stored_transactions(){
        var URL = routes.transactions;
        if(monthId != '') URL = `${URL}?month_id=${monthId}`;
        const result = await send_http_request(URL);
        //remove alredy stored
        if(typeof(result)!=='object' || !('result' in result) || result.error) return false;

        return result.result;
    }//end of fetch_stored_transactions

    var transactions;
    var categories;
    var category_groups = {};
    var inverse_group = {};
    var tallies = {};
    var tallies_groups = {};
    var balance = {
        'ingreso': 0,
        'gasto': 0
    };

    async function update_ui(refresh = false){
        transactions = await fetch_stored_transactions();
        if(refresh == false) categories = await get_categories();
        initialize();
        update_tables();
    }//end of function update_ui

    function initialize(){
        balance = {
            'ingreso': 0,
            'gasto': 0
        };
        category_groups = {};
        inverse_group = {};
        tallies = {};
        tallies_groups = {};
        balance = {
            'ingreso': 0,
            'gasto': 0
        };

        categories.forEach(function(cat){
            if(!(cat.name in category_groups)) category_groups[cat.name] = cat.group_name;
            if(!(cat.name in tallies)) tallies[cat.name] = 0;
            if(!(cat.group_name in inverse_group)){
                inverse_group[cat.group_name] = [cat.name];
                tallies_groups[cat.group_name] = 0;
            }else{
                inverse_group[cat.group_name].push(cat.name);
            }
        });

        var t_keys = Object.keys(transactions);
        t_keys.forEach(function(t_key){
            if(!transactions[t_key].active) return;
            const t = transactions[t_key];
            try{
                if(t.type =='ingreso'){
                    balance.ingreso+= t.amount;
                }else{
                    balance.gasto+= t.amount;
                }
                tallies[t.category]+= t.amount;
                tallies_groups[category_groups[t.category]]+=t.amount;
            }catch(e){}
        });
    }// end of initialize

    function build_table(group){
        var html = '<table class="table table-striped">';
        html+= `<thead><th colspan="2">${group} ${format_amount(tallies_groups[group])}</th></thead><tbody>`;

        inverse_group[group].forEach(function(cat){
            html+=`<tr><td>${cat}</td><td>${format_amount(tallies[cat])}</td></tr>`;
        });

        return html + '</tbody></table>';
    }// build_table

    const trans_tables = $('#latestTransactions');
    function update_tables(){
        var html = '<h3>Transaciones del més</h3>';
        html+= `<h4> Ingresos: ${format_amount(balance.ingreso)} | Gastos:  ${format_amount(balance.gasto)}</h4>`;

        Object.keys(inverse_group).forEach(function(group){
            html+= build_table(group);
        });
        trans_tables.html(html);
    }//end of update_tables

    const monthIdSelector = $('#monthIdSelector');
    const btnChangeMonthId = $('#btnChangeMonthId');
    const inputMonthIdSelector = $('#inputMonthIdSelector');

    btnChangeMonthId.click(function(e){
        e.preventDefault();
        const result = monthIdValidation(inputMonthIdSelector.val());
        if(result === '') return;
        monthId = result;
        monthIdSelector.find('h4 span').html(monthId);
        update_ui(true);
    });

    function monthIdValidation(str){
        if(typeof(str)!= 'string') return '';
        str = str.trim();
        if(str.length != 6) return '';
        const year_str = str.substring(0,4);
        const month_str = str.substring(4);
        if(isNaN(year_str) || isNaN(month_str)) return false;
        const year = parseInt(year_str);
        const month = parseInt(month_str);
        if(year < 2023 || year > 2039) return '';
        if(month < 1 || month > 12) return '';
        return str;
    }//end of monthIdValidation

    //end of function
    update_ui();
    return true;
})();