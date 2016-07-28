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

    set: function(session,name,data) {
        
        /*var date = new Date();
        date.setTime(2144448000000);

        var expires = "expires="+date.toGMTString();
        
        if( this.localStoreSupport() ) {
            localStorage.setItem(name, value);
        }
        else {
            document.cookie = name+"="+value+";"+expires+"; path=/";
        }*/
        var dpack = {}
        dpack.catalog = c1;
        dpack.session = session;
        dpack.name =name;               
        dpack.value = data;        

        if (typeof session !== "undefined" && typeof name !== "undefined" && typeof data !== "undefined") {
            if (session != null && name != null && data != null && session != "" && name != "" && data != "") {
                $.ajax({
                    
                    type: "POST",
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    url: _ajax_url_store_set,
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

    get: function (session, name, succ_func, fail_func) {

        $.ajax({
            type: "GET",
            url: _ajax_url_store_get + "/" + c1 + "/" + session + "/" + name,
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

    del: function (session, name) {
        $.ajax({
            type: "PUT",
            url: _ajax_url_store_del + "/" + c1 + "/" + session + "/" + name,

            error: function (jqXHR, textStatus, errorThrown) {
                //alert('[store_del] Connection to server has failed.\nPlease try reloading the page.');
                /*console.log(textStatus);
                console.log(errorThrown);
                console.log(jqXHR);*/
            }
        });

        /*if( this.localStoreSupport() ) {
            localStorage.removeItem(name);
        }
        else {
            this.set(name,"",-1);
        }*/

    }
}