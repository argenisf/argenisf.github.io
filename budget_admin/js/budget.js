var monthID = "";
const BUDGET_URL = `${SERVER_HOST}/budget`;
const BUDGET_UPDATE_URL = `${SERVER_HOST}/budget/update`;
var budgetItems = {};
var currentRef = "";
const jSummary = $("#JSONSummary").hide();

(async function(){
    //check authentication before proceeding
    const user = await check_authentication();
    const categories = await get_categories();
    const inputMonthId = $('#inputMonthID');
    const btnNewBugdet = $('#btnNewBudget');
    const tableBudget = $('#tableBudget');
    const btnSaveBudget = $('#btnSaveBudget');
    btnSaveBudget.hide();
    const resultsLogging = $('#resultsLogging');

    function _log(msg){
        try{
            var message = msg;
            if(typeof(msg) == "object") message = JSON.stringify(msg);
            resultsLogging.html(`<code>${message}</code>`);
        }catch(e){
            resultsLogging.html(`<code>${e.toString()}</code>`);
        }
    }//end of log

    function validateMonthID(val){
        if(!val || typeof(val)!= 'string') return false;
        val = val.trim();
        if(val == "" || isNaN(val) || val.length!= 6) return false;
        
        const year = parseInt(val.substring(0,4));
        const month = parseInt(val.substring(4,6));
        const currentYear = parseInt(new Date().toISOString().substring(0,4));

        if(year < (currentYear-1) || year > (currentYear+1) || month < 1 || month > 12) return false;
        return true;
    }//end of validateMonthID


    btnNewBugdet.click(function(e){
        e.preventDefault();
        if(monthID == inputMonthId.val() && monthID!= "") return false;
        if(!validateMonthID(inputMonthId.val())) return false;
        const duplicating_previous_month = (monthID!== "")?true:false;
        monthID = inputMonthId.val();
        change_starting_ui(duplicating_previous_month);
    });

    function change_starting_ui(keep_records){
        $('#mainHeader').html(`Presupuesto ${monthID}`);
        if(keep_records){
            _log(`Updated month ID to ${monthID}`);
            $('#selectMonthUI').hide();
            return;
        }
        
        fetch_budget().then(function(items){
            budgetItems = items;
            populate_table();
            btnSaveBudget.show();
            btnNewBugdet.html('Guardar como...')
        });
    }//end of hide_starting_ui_elements

    /*
    --------------------------------
        Code for Categories Select
    --------------------------------
    */
    const categories_select = $('#budgetCategory');
    categories_select.html(format_for_select(categories));
    categories_select.amsifySelect({ type: 'bootstrap' });
    function category_change_value(new_value, reset){
        categories_select.val(new_value);
        if(new_value == "" && reset){
            $('.amsify-selection-area .amsify-label').html(new_value);
        }else{
            const select = categories_select.find('option:selected');
            if(select.length){
                $('.amsify-selection-area .amsify-label').html(select[0].text);
            }
        }
    }//end of category_change_value
    
    /*
    --------------------------------
        Code for Categories Select
    --------------------------------
    */
    
    async function fetch_budget(){
        const url = `${BUDGET_URL}?month_id=${monthID}`;
        const res = await send_http_request(url, 'GET',{});
        
        if(!res || res?.error) return {};

        return res?.result || {};
    }//end of fetch_budget

    function populate_table(){
        const item_keys = Object.keys(budgetItems);
        if(item_keys.length == 0) return;

        var tbody = tableBudget.find('tbody');
        item_keys.forEach(function(item){
            const tr = create_row(item, budgetItems[item]);
            tbody.append(tr);
        });
        update_summary();
    }//end of populate table

    function create_row(key, props){
        var tr = document.createElement("tr");
        var html = '';
            html+= `<td>${key}</td>`;
            html+= `<td>${props?.type}</td>`;
            html+= `<td>${props?.category}</td>`;
            html+= `<td>€ ${props?.amount?.toLocaleString()}</td>`;
            html+= '<td class="acciones"><button class="btn btn-primary btn-sm btnEdit">E</button> <button class="btn btn-danger btn-sm btnDelete">B</button></td>';
        tr.innerHTML = html;
        tr = $(tr);
        tr.data({id: key, props});
        return tr;
    }//end of create_row

    /*
    --------------------------------
        Code for handling form
    --------------------------------
    */
    const formRefLabel = $('#refLabel');
    const budgetForm = $('#formBudget');
    const btnClear = $('#btnClear');
    const btnSave = $('#btnSave');

    const inputBudgetType = $('#budgetType');
    const inputBudgetAmount = $('#budgetAmount');

    budgetForm.submit(function(e){
        e.preventDefault();
    });

    btnClear.click(function(e){ clear_budget_form(); });
    btnSave.click(function(e){ process_budget_form(); });

    function clear_budget_form(){
        budgetForm[0].reset()
        category_change_value('', true);
        currentRef = "";
        update_ref_label();
    }//end of clear_budget_form

    function update_ref_label(){
        const label = (currentRef == "")?'Ref: #':`Ref: ${currentRef}`;
        formRefLabel.html(label);
    }//end of update_ref_label

    function validate_record(type, category,amount){
        if(!(['ingreso','gasto'].includes(type))) return false;
        if(typeof(category) != 'string' || category.trim() == "") return false;
        if(typeof(amount) != 'string' || amount.trim() == "" || isNaN(amount) || parseFloat(amount) == 0) return false;
        return true;
    }//end of validate_record
    
    function process_budget_form(){
        const type = inputBudgetType.val();
        const category = categories_select.val();
        const amount = inputBudgetAmount.val();
        if(!(validate_record(type, category, amount))){
            return;
        }

        update_item({type, category, amount: parseFloat(amount), active: true});
        clear_budget_form();
    }//end of process_budget_form

    function update_item(item){
        var row_to_update = false;
        var table_rows = tableBudget.find('tbody tr');

        if(table_rows.length == 0){
            table_rows = [];
        }

        for (let index = 0; index < table_rows.length; index++) {
            const table_row = $(table_rows[index]);
            const row_data = table_row.data();
            if((currentRef == "" && row_data.props.category == item.category) || row_data.id == currentRef){
                row_to_update = table_row;
            }
        }
        
        update_row(item, row_to_update);
        update_summary();
    }//end of update_items

    function update_row(item,row){
        var row_id;
        if(row !== false){
            row_id = row.data()["id"];
        }else{
            row_id = (currentRef == "")?generate_budget_ref():currentRef;
        }
        budgetItems[row_id] = item;

        const tr = create_row(row_id, item);
        if(row === false){
            var tbody = tableBudget.find('tbody');
            tbody.append(tr);
        }else{
            row.html(tr.html());
            row.data({id: row_id, props: item});
            if(item.active){
                row.removeClass('deleted-row');
            }else{
                row.addClass('deleted-row');
            }
        }
        clear_budget_form();
    }//end of update_row

    function generate_budget_ref(){
        const ts = new Date().getTime();
        return 'bg' + ts.toString().substring(3,13);
    }//end of generate_budget_ref
    
    $(tableBudget.find('tbody')).on('click','.btnEdit',function(){
        const tr = $(this).parent().parent();
        update_form(tr.data().id, tr.data().props);
    });

    function update_form(key, item){
        currentRef = key;
        update_ref_label();

        inputBudgetType.val(item.type);
        inputBudgetAmount.val(item.amount);
        category_change_value(item.category);
    }//end of update_form

    $(tableBudget.find('tbody')).on('click','.btnDelete',function(){
        const tr = $(this).parent().parent();
        const props = JSON.parse(JSON.stringify(tr.data().props));
        props.active = !props.active;
        currentRef = tr.data().id;
        update_item(props);
    });
    
    /*
    --------------------------------
        Code for handling form
    --------------------------------
    */

    /*
    --------------------------------
        Code for handling API
    --------------------------------
    */

    btnSaveBudget.click(function(e){
        btnSaveBudget.hide();
        send_http_request(BUDGET_UPDATE_URL, 'post',{
            month_id: monthID,
            items: budgetItems
        }).then(function(res){
            _log(res);
            btnSaveBudget.show();
        });
    });
    

    /*---- Update Summary --- */
    function update_summary(){
        var jValue = {
            "Ingresos": 0,
            "Gastos": 0,
            "Ahorros": 0
        };
        Object.keys(budgetItems).forEach(function(ref){
            if(budgetItems[ref].active === false) return;
            if(budgetItems[ref].type == "ingreso"){
                jValue["Ingresos"]+= budgetItems[ref].amount;
            }else{
                jValue["Gastos"]+= budgetItems[ref].amount;
            }
       });

       jValue["Ahorros"] = jValue["Ingresos"] - jValue['Gastos'];

       //formatting
       jValue["Ingresos"] = `€${jValue["Ingresos"].toLocaleString()}`;
       jValue["Gastos"] = `€${jValue["Gastos"].toLocaleString()}`;
       jValue["Ahorros"] = `€${jValue["Ahorros"].toLocaleString()}`;

       jSummary.html(JSON.stringify(jValue),undefined,2).show();
    }//end of update_summary
    
    return true;
})();//end of function