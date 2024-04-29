var monthID = "";
const TRANSACTIONS_URL = `${SERVER_HOST}/transactions`;
const BUDGET_URL = `${SERVER_HOST}/budget`;
const CLOSING_URL = `${SERVER_HOST}/closings`;
const CLOSING_UPDATE_URL = `${SERVER_HOST}/closings/update`;
const jSummary = $("#JSONSummary").hide();


(async function(){
    //check authentication before proceeding
    const user = await check_authentication();
    const categories = await get_categories();
    const inputMonthId = $('#inputMonthID');
    const btnNewClosing = $('#btnNewClosing');
    const budgetSummary = {};
    const expensesSummary = {};
    const summaryNumbers = {
        balance: 0,
        income: 0,
        expenses: 0
    };
    const fund_details = {};
    review_funds();
    var passedCheck = false;
    var saving = false;
    
    const fundsTable = $('#fundsTable').hide();
    const btnCloseCheck = $('#btnCloseCheck');
    const btnSaveClosing = $('#btnSaveClosing');
    const resultsLogging = $('#resultsLogging');

    btnSaveClosing.click(function(e){
        e.preventDefault();
        var result = check_funds_balance();
        if(saving || !(result.passed)) return;
        
        saving = true;
        btnSaveClosing.prop('disabled',true);

        const closing_payload = build_closing_payload(result.categories);
        send_request_save_closing(closing_payload).then(function(response){
            saving = false;
            btnSaveClosing.prop('disabled',false);
            if(typeof(response) != "string") response = JSON.stringify(response);
            _log(response);
        });
    });

    btnCloseCheck.click(function(e){
        e.preventDefault();
        var result = check_funds_balance();
        btnSaveClosing.prop('disabled',!(result.passed));
        passedCheck = result.passed;
    });

    function review_funds(){
        categories.forEach(function(row){
            if(row.is_fund){
                fund_details[row.name] = stylize_text(row.name);
            }
        });
    }

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


    btnNewClosing.click(function(e){
        e.preventDefault();
        if(monthID == inputMonthId.val() && monthID!= "") return false;
        if(!validateMonthID(inputMonthId.val())) return false;
        monthID = inputMonthId.val();
        change_starting_ui();
    });

    function change_starting_ui(keep_records){
        $('#mainHeader').html(`Cierre ${monthID}`);
        $('#selectMonthUI').hide();
        _log(`Seleccionado ${monthID} para cierre`);
        get_and_display_data();
    }//end of hide_starting_ui_elements

    async function fetch_budget(){
        const url = `${BUDGET_URL}?month_id=${monthID}`;
        const res = await send_http_request(url, 'GET',{});
        if(!res || res?.error) return {};
        return res?.result || {};
    }//end of fetch_budget

    async function fetch_transactions(){
        const url = `${TRANSACTIONS_URL}?month_id=${monthID}`;
        const res = await send_http_request(url, 'GET',{});
        if(!res || res?.error) return {};
        return res?.result || {};
    }//end of fetch_budget

    async function get_and_display_data(){
        const transaction_result = await fetch_transactions();
        const budget_result = await fetch_budget();
        
        Object.keys(budget_result).forEach(function(key){
            if(budget_result[key]["type"] == "gasto") budgetSummary[budget_result[key]["category"]] = budget_result[key]["amount"];
        });

        Object.keys(transaction_result).forEach(function(key){
            let amount = transaction_result[key]["amount"];
            
            if(transaction_result[key]["type"] == "gasto"){
                summaryNumbers.expenses+= amount;
                if(transaction_result[key]["category"] in expensesSummary){
                    expensesSummary[transaction_result[key]["category"]]+= amount;
                }else{
                    expensesSummary[transaction_result[key]["category"]] = amount;
                }
            }else{
                summaryNumbers.income+= amount;
            } 
        });

        if(summaryNumbers.income > 0 || summaryNumbers.expenses > 0){
            summaryNumbers.balance = summaryNumbers.income + summaryNumbers.expenses;
        }

        const JSONSummary = JSON.stringify(expensesSummary).replaceAll(',"',',\n"');
        const summaryText = `Balance: ${format_amount(summaryNumbers.balance)} | Ingresos: ${format_amount(summaryNumbers.income)} Gastos: ${format_amount(summaryNumbers.expenses)}`;

        jSummary.html(JSONSummary).show();
        jSummary.parent().append(`<p class="balanceSummary">${summaryText}</p>`);
        populate_funds_table();

    }//end of get_and_display_data

    function populate_funds_table(){
        var html = "";
        var tr = "";
        Object.keys(fund_details).forEach(function(key){
            const expenses = (key in expensesSummary)?expensesSummary[key]:0;
            const budget = (key in budgetSummary)?budgetSummary[key]:0;
            tr = `<tr><td>${fund_details[key]}</td>`;
            tr+= `<td class="number">${format_amount(budget)}</td><td class="number">${format_amount(expenses)}</td>`;
            tr+= `<td><input data-fund="${key}" class="fundDiff" type="number" value="${(budget+expenses).toFixed(2)}" /></td></tr>`;
            html+= tr;
        });

        fundsTable.find('tbody').html(html);
        fundsTable.show();
    }//end of populate_funds_table

    function check_funds_balance(){
        var balance = 0;
        var inputs = fundsTable.find('tbody .fundDiff');
        var input;
        var returnObject = {categories: {}};
        var amount = 0;
        for(var i = 0; i < inputs.length; i++){
            input = $(inputs[i]);
            amount = parseFloat(input.val());
            balance+= amount
            returnObject.categories[input.data('fund')] = amount;
        }
        
        _log(`Balance: ${format_amount(summaryNumbers.balance)} vs Check: ${format_amount(balance)} => ${format_amount(summaryNumbers.balance-balance)}`);
        returnObject.passed = ((summaryNumbers.balance-balance) < 1 && (summaryNumbers.balance-balance) > -1)?true:false;
        return returnObject;
    }//end of check_funds_balance

    function build_closing_payload(funds){
        return {
            funds,
            closing: {
                'month_id': monthID,
                'balance': summaryNumbers.balance,
                'income': summaryNumbers.income,
                'expenses': summaryNumbers.expenses,
                'categories': expensesSummary,
            }
        }
    }//end of build_closing_payload

    async function send_request_save_closing(payload){
        return await send_http_request(CLOSING_UPDATE_URL,'POST',payload);
    }//end of send_request_save_closing

})();//end of function