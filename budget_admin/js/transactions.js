var transactions = {};
var stored_transactions = {};
var recurring_t = [];
var pending_t = [];
const table_content = $('#transactionTable tbody');
const btnUpdateGCP = $('#btnUpdateGCP').hide();
const btnChangeToEdit = $('#btnChangeToEdit').hide();
const btnShowHideUpdated = $('#btnShowHideUpdated').hide();
const catModal = $('#catModal').modal('hide');
const categorySuggestions = $('#categorySuggestions tbody');
const btnCloseModal = $('#btnCloseModal');
var month_id = '';
var current_month_id = '';
var hide_updated_ones = true;

(async function(){
    //check authentication before proceedin
    const user = await check_authentication();
    const resultsLogging = $('#resultsLogging');
    const categories = await get_categories();
    function _log(msg){
        try{
            var message = msg;
            if(typeof(msg) == "object") message = JSON.stringify(msg);
            resultsLogging.html(`<code>${message}</code>`);
        }catch(e){
            resultsLogging.html(`<code>${e.toString()}</code>`);
        }
    }//end of log    

    
    
    //---- Load initial data ----- //
    function get_initial_data(){
        const i_data = localStorage.getItem(CSV_FILE_NAME);
        let initial_data;
        if(!i_data) return [];
        try{
            initial_data = JSON.parse(i_data);
        }catch(e){ return []; }
        if(!initial_data || !('expiry' in initial_data)) return [];
        if(get_time_in_seconds() > initial_data.expiry){
            localStorage.removeItem(CSV_FILE_NAME);
            console.log('removed old CSV file');
            return [];
        }

        if(!'data' in initial_data) return [];
        return initial_data.data;
    }//end of load_data

    function convert_initial_data(initial_data){
        var month_id_keys = {};
        initial_data.forEach(function(row){
            const m_id = new Date(row.time*1000).toISOString().substring(0,7);
            transactions[row.reference] = row;
            if(m_id in month_id_keys){
                month_id_keys[m_id]++;
            }else{
                month_id_keys[m_id]=1;
            }
        });
        var max_id = 0;
        Object.keys(month_id_keys).forEach(function(m_id){
            if(max_id == 0 || month_id_keys[m_id] > max_id){
                month_id = m_id;
                max_id = month_id_keys[m_id];
            }
        });

        if(month_id=='') month_id = new Date().toISOString().substring(0,7);
        month_id = month_id.replace('-','');
    }//end of convert_initial_data

    function sort_by_time_descending(arr) {
        return arr.slice().sort((a, b) => b.time - a.time);
    }

    //-- tabel manipulation --//
    function populate_table(first_time = false){
        table_content.html('');
        const item_keys = Object.keys(transactions);
        if(item_keys.length == 0) return;

        var unsorted = [];
        item_keys.forEach(function(item){
            unsorted.push(transactions[item]);
        });

        var sorted_arr = sort_by_time_descending(unsorted);

        sorted_arr.forEach(function(item){
            const tr = create_row(item.reference, item,!first_time);
            table_content.append(tr);
        });

        _log(`${item_keys.length} transacciones cargadas`);
    }//end of populate table

    function create_row(key, props, restrict_suggestions){
        const suggestions = (restrict_suggestions)?[]:get_suggestions(props);
        var additional_css_classes = '';
        var category_badge = '';
        
        if(suggestions.length > 0){
            if(suggestions[0].score == 1){
                if(props.category != suggestions[0].category){
                    props.category = suggestions[0].category;
                    transactions[key].category = props.category;
                    additional_css_classes = 'success';
                    if(suggestions[0].description!= '') props.description = suggestions[0].description;

                    if(suggestions[0].source) props.description+= ' | ' + suggestions[0].source;
                }
            }else{
                category_badge = `<a href="#" class="categoryBadge"><span class="badge">${suggestions.length}</span></a>`;
            }
        }
        
        var tr = document.createElement("tr");
        var html = '';
            html+= '<td><input type="checkbox" class="chkSelectMulti" /></td>';
            html+= `<td>${format_date(props.time*1000)}</td>`;
            html+= `<td><a href="#" class="btnRef"><abbr title="${key}">${key.substring(0,10)}...</abbr></td>`;
            html+= `<td>${props?.category} ${category_badge}</td>`;
            html+= `<td>${props?.description}</td>`;
            html+= `<td class="number ${number_styling(props.amount)}">${format_amount(props.amount)}</td>`;
            html+= '<td class="right"><input type="checkbox" class="btnDelete" /></td>';
        tr.innerHTML = html;
        tr = $(tr).addClass(`trRef${key} ${additional_css_classes}`);
        tr.data({id: key, props});
        
        return tr;
    }//end of create_row

    function number_styling(value){
        if(typeof(value) != 'number') return '';
        if(value > 0) return 'highlight positive';
        if(value < -100) return 'highlight negative';
        return '';
    }//end of number_styling

    table_content.on('click','.btnRef',function(e){
        e.preventDefault();
        edit_transaction($(this).parent().parent().data());
    });
    table_content.on('change','.btnDelete',function(e){
        e.preventDefault();
        const element = $(this);
        delete_transaction(element.parent().parent().data(), element);
    });

    table_content.on('click','.categoryBadge',function(e){
        e.preventDefault();
        const element = $(this);
        populate_suggestions_table(element.parent().parent().data());
    });

    
    function populate_suggestions_table(data){
        console.log(data);
        const item = data.props;
        const suggestions = get_suggestions(item);
        categorySuggestions.html('');

        var tr,html;
        suggestions.forEach(function(suggestion){
            tr = document.createElement("tr");
            html = '';
            html+= `<td>${suggestion.source}</td>`;
            html+= `<td><a href="#" class="btnSelectedSugCat">${suggestion?.category}</a></td>`;
            html+= `<td class="number">${format_amount(suggestion.amount)}</td>`;
            html+= `<td>${suggestion?.description}</td>`;
            tr.innerHTML = html;
            tr = $(tr);
            tr.data({suggestion,item});
            categorySuggestions.append(tr);
        });
        catModal.modal().show();
    }

    categorySuggestions.on('click','.btnSelectedSugCat',function(e){
        e.preventDefault();
        const element = $(this);
        const data = element.parent().parent().data();

        var new_item = JSON.parse(JSON.stringify(data.item));
        new_item.category = data.suggestion.category;
        if(data.suggestion.source && !(data.suggestion.source.includes('common:')))
        if(data.suggestion.description && data.suggestion.description != ''){
            new_item.description= data.suggestion.description + ' | ' + data.suggestion.source;
        }else{
            new_item.description+= ' | ' + data.suggestion.source;
        }

        store_record(new_item);
        btnCloseModal.click();
    });

    function edit_transaction(data){
        inputRef.val(data.id);
        inputDate.val(new Date(data.props.time*1000).toISOString().substring(0,10));
        inputAmount.val(data.props.amount.toString());
        inputDescription.val(data.props.description).focus();
        category_change_value(data.props.category);
    }//end of edit_transaction

    function delete_transaction(data, element){
        const to_delete = element.prop( "checked");
        const new_data = JSON.parse(JSON.stringify(data));
        if(to_delete){
            new_data.props.active = false;
            element.parent().parent().addClass('deleted-row');
        }else{
            new_data.props.active = true;
            element.parent().parent().removeClass('deleted-row');
        }
        transactions[new_data.id] = new_data.props;
    }//end of delete_transaction

    convert_initial_data(get_initial_data());
    await fetch_stored_transactions();
    await fetch_recurring_and_pending();
    populate_table(true);
    btnUpdateGCP.show();
    btnChangeToEdit.show();
    btnShowHideUpdated.show();

    btnChangeToEdit.click(function(){
        btnChangeToEdit.hide();
        transactions = stored_transactions;
        populate_table();
    });

    btnShowHideUpdated.click(function(){
        hide_updated_ones = !hide_updated_ones;
        run_visibility_check();
    });

    function run_visibility_check(){
        const trs = table_content.find('tr');
        for(var i = 0; i < trs.length; i++){
            var tr = $(trs[i]);
            var data = tr.data();
            if('props' in data && data?.props?.category && tr.data()?.props?.category!= ''){
                if(hide_updated_ones){
                    tr.hide();
                }else{
                    tr.show();
                }
            }
        }
    }//end of run_visibility_check

    //---- Form interactions ---- //
    const mainForm = $('#mainForm');
    const inputDate = $('#inputDate');
    const inputRef = $('#inputRef');
    const inputAmount = $('#inputAmount');
    const inputDescription = $('#inputDescription');
    const btnReset = $('#btnReset');
    const btnSave = $('#btnSave');

    mainForm.submit(function(e){
        e.preventDefault();
    })
    function reset_form(){
        mainForm[0].reset();
        category_change_value('');
    }//end of reset_form

    btnReset.click(function(e){reset_form();});

    btnSave.click(function(e){
        const refs = $('.chkSelectMulti:checked');
        if(refs.length > 0){
            store_multiple_records(validate_multiple_records(refs));
        }else{
            const result = validate_record();
            if( result === false) return;
            store_record(result);
        }
    });

    function validate_record(){
        const time = (validateDateString(inputDate.val()))?get_time_in_seconds(new Date(inputDate.val()+"T00:00:00")):false;
        const category = (validateString(categories_select.val()))?categories_select.val():false;
        const amount = convertToNumber(inputAmount.val());
        const description = (validateString(inputDescription.val()))?inputDescription.val():false;

        if(time === false || category === false || amount === false || description === false) return false;
        return {
            time, category, amount,description
        }
    }//end of validate_record

    function validate_multiple_records(checks){
        const category = (validateString(categories_select.val()))?categories_select.val():false;
        if (category == false) return false;
        var refs = [];
        var data = {};
        for(var i = 0; i< checks.length; i++){
            data = $(checks[i]).parent().parent().data();
            if(data && 'id' in data){
                refs.push(data);
            }
        }
        return {
            category,
            refs
        }
    }//end of validate_multiple_records

    /*
    --------------------------------
        Code for Categories Select
    --------------------------------
    */
    const categories_select = $('#inputCategory');
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

    function new_ref(){
        return `ref${new Date().getTime()}`;
    }//end new_ref

    function store_record(result){
        var ref = "";
        if('reference' in result){
            ref = result.reference;
        }else{
            if(inputRef.val() != "") ref = inputRef.val().trim();
        }
        if(ref == "") ref = new_ref();
        
        const record = {
            time: result.time,
            category: result.category,
            reference:ref,
            amount: result.amount,
            description: result.description
        };

        transactions[record.reference] = record;
        update_row(record);
        reset_form();
    }//end of store_record

    function store_multiple_records(result){
        if(result == false || !('refs' in result) || !(result.refs.length > 0)) return;
        result.refs.forEach(function(ref){
            const record = {
                time: ref.props.time,
                category: result.category,
                reference:ref.id,
                amount: ref.props.amount,
                description: ref.props.description
            };
    
            transactions[record.reference] = record;
            update_row(record);
        });
        reset_form();
    }//end of store_multiple_records

    function update_row(item){
        let row = table_content.find(`.trRef${item.reference}`);
        item.active = true;
        var tr;
        tr = create_row(item.reference, item, true);
        if(row.length == 0){
            table_content.append(tr);
        }else{
            row = $(row);
            row.html(tr.html()).data({id: item.reference, props: item});
            if(item.category && item.category != ''){
                if(hide_updated_ones){
                    row.hide();
                }else{
                    row.show();
                }
            }
        }
    }//end of update_row

    // --- fetch already stored data
    async function fetch_stored_transactions(){
        if(current_month_id!='') month_id = current_month_id;
        const URL = (month_id!='')?`${routes.transactions}?month_id=${month_id}`:routes.transactions;
        const result = await send_http_request(URL);
        //remove alredy stored
        if(typeof(result)!=='object' || !('result' in result) || result.error) return false;

        stored_transactions = result.result;

        var removed = 0;
        var downloaded_keys = Object.keys(stored_transactions);
        downloaded_keys.forEach(function(stored_key){
            if(stored_key in transactions){
                removed++;
                delete transactions[stored_key];
            }
        });
        console.log(`${removed} transactions removed out of ${downloaded_keys.length}`)

    }//end of fetch_stored_transactions

    // --- fetch recurring and pending transactions
    async function fetch_recurring_and_pending(){
        const URL = (month_id!='')?`${routes.future}?month_id=${month_id}`:routes.future;
        const result = await send_http_request(URL);
        
        if(typeof(result)!=='object' || !('result' in result) || result.error) return false;

        //convert recurring
        if('recurring' in result.result){
            Object.keys(result.result.recurring).forEach(function(rec){
                recurring_t.push({
                    amount: result.result.recurring[rec].amount,
                    category: result.result.recurring[rec].category,
                    time: result.result.recurring[rec].start._seconds,
                    description: result.result.recurring[rec].description,
                    reference: rec
                })
            });
        }

        //convert pending
        if('pending' in result.result){
            Object.keys(result.result.pending).forEach(function(rec){
                pending_t.push({
                    amount: result.result.pending[rec].amount,
                    category: result.result.pending[rec].category,
                    time: result.result.pending[rec].time,
                    description: result.result.pending[rec].description,
                    reference: rec
                })
            });
        }

        return true;
    }//end of fetch_recurring_and_pending

    // --- update on GCP
    var updatingGCP = false;
    btnUpdateGCP.click(function(){
        if(updatingGCP) return;
        updatingGCP = true;
        send_transactions_to_gcp().then(function(result){
            updatingGCP = false;
            if(result === true){
                run_visibility_check();
                _log('Updated records on GCP at '+ new Date().toISOString());
                return;
            }
            
            if(typeof(result.message) == 'string'){
                _log(result.message);
            }else if(typeof(result) == 'string'){
                _log(result);
            }else{
                _log('Unknown error');
            }
        });
    });

    async function send_transactions_to_gcp(){
        //update only transactions with a category
        var t_object = {};
        Object.keys(transactions).forEach(function(t){
            if('category' in transactions[t]) t_object[t] = transactions[t];
        })

        if(Object.keys(t_object).length == 0) return 'No transactions to update';
        const payload = {
            month_id,
            items: t_object
        };

        const result = await send_http_request(routes.transactions+'/update','POST',payload);
        if(result.result) return true;
        return result.message || "Unknown error";

    }//end of send_transactions_to_gcp


    const monthIdSelector = $('#monthIdSelector');
    const btnChangeMonthId = $('#btnChangeMonthId');
    const inputMonthIdSelector = $('#inputMonthIdSelector');

    btnChangeMonthId.click(async function(e){
        e.preventDefault();
        const result = monthIdValidation(inputMonthIdSelector.val());
        if(result === '') return;
        btnChangeMonthId.prop('disabled',true);

        current_month_id = result;
        monthIdSelector.find('h4 span').html(current_month_id);
        await fetch_stored_transactions();
        transactions = stored_transactions;
        populate_table();

        btnChangeMonthId.prop('disabled',false);
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


    return true;
})();