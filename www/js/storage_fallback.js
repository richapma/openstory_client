window.store = {
    localStoreSupport: function() {
        try {
            return 'localStorage' in window && window['localStorage'] != null;
        } catch (e) {
            return false;
        }
    },

    set_local: function(name,value) {
        var date = new Date();
        date.setTime(2144448000000);

        var expires = "expires=" + date.toGMTString();

        if (this.localStoreSupport()) {
            localStorage.setItem(name, value);
        }
        else {
            document.cookie = name + "=" + value + ";" + expires + "; path=/";
        }
    },

    set: function(key,data) {
        console.log(key);
        console.log(data);
        var dpack = {}
        dpack.catalog = c1;
        dpack.key = key;               
        dpack.data = data;        

        if (typeof key !== "undefined" && typeof data !== "undefined") {
            if (key != null && data != null && key != "" && data != "") {
                $.ajax({
                    
                    type: "PUT",
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    url: _ajax_url_write_store_mongo,
                    data: JSON.stringify(dpack),                   

                    error: function (jqXHR, textStatus, errorThrown) {
                        alert('[store_set] Connection to server has failed.\nPlease try reloading the page.');
                        /*console.log(textStatus);
                        console.log(errorThrown);
                        console.log(jqXHR);*/
                    }
                });
            }
        }
    },

    get_local: function (name){
        if( this.localStoreSupport() ) {
            var ret = localStorage.getItem(name);
            switch (ret) {
                case 'true': 
                    return true;
                case 'false':
                    return false;
                default:
                    return ret;
            }
        }
        else {
            var nameEQ = name + "=";
            var ca = document.cookie.split(';');
            for(var i=0;i < ca.length;i++) {
                var c = ca[i];
                while (c.charAt(0)==' ') c = c.substring(1,c.length);
                if (c.indexOf(nameEQ) == 0) {
                    ret = c.substring(nameEQ.length,c.length);
                    switch (ret) {
                        case 'true': 
                            return true;
                        case 'false':
                            return false;
                        default:
                            return ret;
                    }
                }
            }
            return null;
        }
    },

    get: function (key, succ_func, fail_func) {

        $.ajax({
            type: "GET",
            url: _ajax_url_read_store_mongo + "/" + c1 + "/" + key,
            sfunc: succ_func,
            ffunc: fail_func,
            success: function (data) {
                this.sfunc(data);
            },

            error: function (jqXHR, textStatus, errorThrown) {
                this.ffunc();
                //alert('[store_get] Connection to server has failed.\nPlease try reloading the page.');                
                /*console.log(textStatus);
                console.log(errorThrown);
                console.log(jqXHR);*/
            }
        });

        return null;
        /*if( this.localStoreSupport() ) {
            var ret = localStorage.getItem(name);
            switch (ret) {
                case 'true': 
                    return true;
                case 'false':
                    return false;
                default:
                    return ret;
            }
        }
        else {
            var nameEQ = name + "=";
            var ca = document.cookie.split(';');
            for(var i=0;i < ca.length;i++) {
                var c = ca[i];
                while (c.charAt(0)==' ') c = c.substring(1,c.length);
                if (c.indexOf(nameEQ) == 0) {
                    ret = c.substring(nameEQ.length,c.length);
                    switch (ret) {
                        case 'true': 
                            return true;
                        case 'false':
                            return false;
                        default:
                            return ret;
                    }
                }
            }
            return null;
        }*/
    },
}