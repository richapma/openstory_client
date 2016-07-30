/* Copyright (C) Richard Chapman - All Rights Reserved 
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Richard Chapman, 2014
 * This file is only allowed to be used within a AdventureMashup.com product.
 */
//***TODO: Change this be async storage or change it so it gets an array of values from the server for all the saved settings to do with the menu.
//***TODO: Test current state.
//***TODO: FIX SAVE_SLOT AUTO SAVE.

//*** NOTE: to debug, change window.__offline to 1 and include this js file in the index.html file.
window.__offline = 1;
window._AM_loaded = false;
window._story_settings = {};

slider_value = 1;
which_menu = "";
video_int_scale = null;
menu_displayed = false;

(function (_AMI, $, undefined) {
_AMI.catalog = {};
_AMI.get_scale = function get_scale() {
    return $("#video_size").width() / _AMI.catalog.width;
}

function window_resize() {
    document.getElementById("story").setAttribute('style', 'font-size:' + Math.floor(_AMI.catalog.fontSize * _AMI.get_scale()) + 'px;');
}
$(window).resize(window_resize);

_AMI.show_sign_in = function show_sign_in() {
    which_menu = "continue";
    menu_displayed = true;
    session_id = "";
    store.set_local("_AM.session_id", session_id);
    if (_AM) {
        _AM.pause_scene();
    }
    $("#story_signin").popup("open");
}

_AMI.save_story_settings = function save_story_settings(){
    store.set(_story_name_settings, JSON.stringify(window._story_settings));
}

function wireup() {    
    var start_div;
    var scale;   
    window_resize();

    $(document).on("taphold", function () {
        if (!menu_displayed) {
            menu_displayed = true;
            //if (session_id) {
                $("#story_main_menu").popup("open");
                if (_AM) {
                    _AM.pause_scene();
                }
            /*} else {
                $("#story_signin").popup("open");
                if (_AM) {                    
                    _AM.pause_scene();
                }
            }*/
        }
    });

    $("#story_signin").on("popupbeforeposition", function (event, ui) {
        //clear the fields if they already have values.
        //email, password.
    });

    $("#story_main_menu").on("popupbeforeposition", function (event, ui) {
        //sync the current values in _AM.
        //if (!store.get_local(session_id, _story_name + "save_slot")) {
        if (!("save_slot" in window._story_settings)) {
            window._story_settings["save_slot"] = 1;
            slider_value = 1;
        } else {
            slider_value = window._story_settings["save_slot"];
        }


        //$('#slider-new').val(slider_value).slider("refresh");
        $('#slider-save').val(slider_value).slider("refresh");
        $('#slider-resume').val(slider_value).slider("refresh");

        //if (store.get_local(session_id, "scramble_mode") && parseInt(store.get_local(session_id, "scramble_mode"))) {
        if(("scramble_mode" in window._story_settings) && parseInt(window._story_settings["scramble_mode"])){
            $('#sc_game_mode').val('Scramble').selectmenu('refresh');
            if (window._AM_loaded) {
                _AM.scramble_mode = 1;
                _AM.read_mode = 0;
                _AM.type_mode = 0;
                _AM.none_mode = 0;
            }
            //} else if (store.get_local(session_id, "read_mode") && parseInt(store.get_local(session_id, "read_mode"))) {
        } else if (("read_mode" in window._story_settings) && parseInt(window._story_settings["read_mode"])) {
            $('#sc_game_mode').val('Read').selectmenu('refresh');
            if (window._AM_loaded) {
                _AM.scramble_mode = 0;
                _AM.read_mode = 1;
                _AM.type_mode = 0;
                _AM.none_mode = 0;
            }
            //} else if (store.get_local(session_id, "type_mode") && parseInt(store.get_local(session_id, "type_mode"))) {
        } else if (("type_mode" in window._story_settings) && parseInt(window._story_settings["type_mode"])) {
            $('#sc_game_mode').val('Type').selectmenu('refresh');
            if (window._AM_loaded) {
                _AM.scramble_mode = 0;
                _AM.read_mode = 0;
                _AM.type_mode = 1;
                _AM.none_mode = 0;
            }

            //} else if (store.get_local(session_id, "none_mode") && parseInt(store.get_local(session_id, "none_mode"))) {
        } else if (("none_mode" in window._story_settings) && parseInt(window._story_settings["none_mode"])) {
            $('#sc_game_mode').val('None').selectmenu('refresh');
            if (window._AM_loaded) {
                _AM.scramble_mode = 0;
                _AM.read_mode = 0;
                _AM.type_mode = 0;
                _AM.none_mode = 1;
            }
        }

        //if (!store.get_local(session_id, "audio_stream_volume")) {
        if(!("audio_stream_volume" in window._story_settings)){
            window._story_settings["audio_stream_volume"] = 80;
        }
        $('#slider-audio-vol').val(parseInt(window._story_settings["audio_stream_volume"])).slider("refresh");


        if (!("video_stream_volume" in window._story_settings)) {
            window._story_settings["video_stream_volume"] = 80;
        }
        $('#slider-video-vol').val(parseInt( window._story_settings["video_stream_volume"])).slider("refresh");


        //set_slider_label("slider-new-prompt", slider_value);
        set_slider_label("slider-save-prompt", slider_value);
        set_slider_label("slider-resume-prompt", slider_value);

        
        if (("auto_save" in window._story_settings) && parseInt(window._story_settings["auto_save"])) {
            $('#button-exit').removeClass("ui-disabled");
            $('#button-save-story').removeClass("ui-disabled");
        } else {
            $('#button-exit').addClass("ui-disabled");
            $('#button-save-story').addClass("ui-disabled");
        }
    });


    $('#sc_game_mode').on('change', function (event) {
        if ($('#sc_game_mode').val() == "Scramble") {

            window._story_settings["scramble_mode"]= 1;
            window._story_settings["read_mode"] = 0;
            window._story_settings["type_mode"] = 0;
            window._story_settings["none_mode"] = 0;
            if (window._AM_loaded) {
                _AM.scramble_mode = 1;
                _AM.read_mode = 0;
                _AM.type_mode = 0;
                _AM.none_mode = 0;
            }
        } else if ($('#sc_game_mode').val() == "Read") {
            //check read is compatiable with browser..
            if (('webkitSpeechRecognition' in window)) {
                //good to set.
                window._story_settings["scramble_mode"] = 0;
                window._story_settings["read_mode"]= 1;
                window._story_settings["type_mode"]=0;
                window._story_settings["none_mode"]=0;
                if (window._AM_loaded) {
                    _AM.scramble_mode = 0;
                    _AM.read_mode = 1;
                    _AM.type_mode = 0;
                    _AM.none_mode = 0;
                }
            } else {
                alert('Your browser does not support Game Mode:Read - Chrome does.');
                $('#sc_game_mode').val("Scramble");
                window._story_settings["scramble_mode"] = 1;
                window._story_settings["read_mode"] = 0;
                window._story_settings["type_mode"] = 0;
                window._story_settings["none_mode"] = 0;
                if (window._AM_loaded) {
                    _AM.scramble_mode = 1;
                    _AM.read_mode = 0;
                    _AM.type_mode = 0;
                    _AM.none_mode = 0;
                }
            }
        } else if ($('#sc_game_mode').val() == "Type") {
            window._story_settings["scramble_mode"] = 0;
            window._story_settings["read_mode"] =0;
            window._story_settings["type_mode"]=1;
            window._story_settings["none_mode"]=0;
            if (window._AM_loaded) {
                _AM.scramble_mode = 0;
                _AM.read_mode = 0;
                _AM.type_mode = 1;
                _AM.none_mode = 0;
            }
        } else if ($('#sc_game_mode').val() == "None") {
            window._story_settings["scramble_mode"]=0;
            window._story_settings["read_mode"]=0;
            window._story_settings["type_mode"]=0;
            window._story_settings["none_mode"] = 1;
            if (window._AM_loaded) {
                _AM.scramble_mode = 0;
                _AM.read_mode = 0;
                _AM.type_mode = 0;
                _AM.none_mode = 1;
            }
        }

    });

    //$('#region_new').on('click', function (event) { $("#slider-new").on('change', new_slot_change); });        
    $('#region_save').on('click', function (event) { $("#slider-save").on('change', save_slot_change); });
    $('#region_resume').on('click', function (event) { $("#slider-resume").on('change', resume_slot_change); });

    //start slider fix, problem in chrome and firefox.
    $('a', '#slider-audio-vol-li').on('click', function (event) { event.preventDefault(); });
    $('a', '#slider-video-vol-li').on('click', function (event) { event.preventDefault(); });
    //$('a', '#slider-new-li').on('click', function (event) { event.preventDefault(); });
    $('a', '#slider-save-li').on('click', function (event) { event.preventDefault(); });
    $('a', '#slider-resume-li').on('click', function (event) { event.preventDefault(); });
    //end slider fix.

    $("#slider-audio-vol").on('change', function (event) {
        //store.set_local(session_id, "audio_stream_volume", $("#slider-audio-vol").slider().val());
        window._story_settings["audio_stream_volume"] = $("#slider-audio-vol").slider().val();
    });

    $("#slider-video-vol").on('change', function (event) {
        //store.set_local(session_id, "video_stream_volume", $("#slider-video-vol").slider().val());
        window._story_settings["video_stream_volume"] = $("#slider-video-vol").slider().val();
    });

    $("#flip-scramble").on('change', function (event) {
        //store.set_local(session_id, "scramble_mode", $("#flip-scramble").slider().val());
        window._story_settings["scramble_mode"] = $("#flip-scramble").slider().val();
    });


    //schedule popup.
    //this seems to open too soon in chrome... when to know if this is ok to call yet or not???
    if (("auto_save" in window._story_settings) && parseInt(window._story_settings["auto_save"])) {
        //resume from auto save.
        //var trying = setInterval(function () { if (_AM.ready) { clearInterval(trying); $("#story_continue").popup("open"); } }, 250);
        which_menu = "continue";
        getAdventure_Mashup();
        /*if (store.get_local("_AM.session_id")) {
            session_id = store.get_local("_AM.session_id");
            getAdventure_Mashup();
            //$("#story_continue").popup("open");
        } else {
            menu_displayed = true;
            $("#story_signin").popup("open");
        }*/
        //$("#story").removeClass("background_div_landing");
    }else{
        //var trying = setInterval(function () { if (_AM.ready) { clearInterval(trying); $("#story_main_menu").popup("open"); } }, 250);
        scale = _AMI.get_scale();
        //flash click to start.
        start_div = document.createElement('div');
        start_div.setAttribute('id', 'story_div_image_play');
        start_div.setAttribute('class', 'story_div_image_flash');

        image = {};
        image.width = 340;
        image.height = 35;
        image.max_width = 340;
        image.max_height = 35;
        //image.src = _AM.image_path + 'speaker_icon_off.svg';
        start_div.setAttribute('style', 'top:50%; left:50%; margin-top:-' + (image.height * scale / 2.0) + 'px; margin-left:-' + (image.width * scale / 2.0) + 'px; width:' + (image.width * scale).toFixed(0) + 'px; height:' + (image.height * scale).toFixed(0) + "px; background-image: url('https://adventuremashup.com/images/_Logo_Adventure_Mashup_Site_With_Play.svg'); background-size: " + (image.max_width * scale).toFixed(0) + "px " + (image.max_height * scale).toFixed(0) + "px; background-position: 0px 0px; border-width:" + (4 * scale).toFixed(0) + "px; border-style:solid; border-color:#00D8CD;");
        //start_div.setAttribute('style', 'width:' + (image.width * s).toFixed(0) + 'px; height:' + (image.height * s).toFixed(0) + "px; background-image: url('/www/image/sentence_icon_off.svg'); background-size: " + (s * 100.00).toFixed(2) + "%; " + (s * 100.00).toFixed(2) + "%; ");
        //image_div.setAttribute('style', "left:" + (video_offset.left + (image.x * video_intrinsic_scale)) + "px; top:" + (video_offset.top + (image.y * video_intrinsic_scale)) + "px; width: 50px; height: 50px;" );
        start_div.setAttribute('onselectstart', 'return false;');
        start_div.setAttribute('ondragstart', 'return false;');

        document.body.appendChild(start_div);
        //end click to start.
        //_AM.image_flash(start_div);

        which_menu = "main";
        $(document).on('click', function () {
            $(this).off('click'); $(start_div).stop(); $(start_div).remove();
            //$("#story").removeClass("background_div_landing");
            getAdventure_Mashup();
            /*if (session_id) {
                getAdventure_Mashup();
                //$("#story_main_menu").popup("open");
            } else {
                menu_displayed = true;
                $("#story_signin").popup("open");
            }*/
        });
    } 
}

var __dependency = 0;

function dep_check() {
    if (__dependency > 2) {
        //dependencies loaded
        wireup();
    } else {
        setTimeout(function () { dep_check(); }, 1000);
    }
}

_AMI.initOnLoad = function initOnLoad() {
    //get global variables
    $.get(_ajax_url_read_catalog + "/" + c1,
    function (data) {
        _AMI.catalog = data;
        __dependency++;
    });

    //get first scene
    $.get(_ajax_url_read_firstscene_mongo + "/" + c1,
    function (data) {
        (new Function(data))();
        __dependency++;
    });

    //get story_settings.
   
        $.ajax({
            type: "GET",
            url: _ajax_url_read_store_mongo + "/" + c1 + "/" + _story_name_settings,
            success: function (data) {
                if (data != 'false') {
                    //get all saved menu settings.
                    window._story_settings = JSON.parse(data);
                }
                __dependency++;
            },
            error: function (jqXHR, textStatus, errorThrown) {
                alert('[loading settings] Connection to server has failed.\nPlease try reloading the page.');
                __dependency++;
            }
        });

    setTimeout(function () { dep_check(); }, 1000);
}

var __ready = 0;

function getAdventure_Mashup() {
    if (window._AM_loaded) {
        menu_displayed = true;
        if (which_menu == "main") {
            $("#story_main_menu").popup("open");
        } else {
            $("#story_continue").popup("open");
        }
    } else {
        if (__offline) {
            if (!_AM_loaded) {
                var fileref = document.createElement('script');
                fileref.setAttribute("type", "text/javascript");
                fileref.setAttribute("src", "www/js/openstory_client.js");
                document.getElementsByTagName("head")[0].appendChild(fileref);

                fileref = document.createElement('script');
                fileref.setAttribute("type", "text/javascript");
                fileref.setAttribute("src", "www/js/openstory_init.js");
                document.getElementsByTagName("head")[0].appendChild(fileref);

                __ready++;
                readyCheck();
            }
        } else {
            if (!_AM_loaded) {
                $.get(_ajax_url_precache + "/" + g1 + "/" + session_id + "/" + g2,
                function (data) {
                    if (data == "false") {
                        _AMI.show_sign_in();
                    } else {
                        (new Function(data))();
                        __ready++;
                        readyCheck();
                    }
                });
            } else {
                __ready++;
                readyCheck();
            }
        }

        //setTimeout(function () { readyCheck(); }, 1000);
    }
}

function readyCheck() {
    if (__ready > 0) {
        if (("scramble_mode" in window._story_settings) && parseInt(window._story_settings["scramble_mode"])) {
            $('#sc_game_mode').val('Scramble').selectmenu('refresh');
            if (window._AM_loaded) {
                _AM.scramble_mode = 1;
                _AM.read_mode = 0;
                _AM.type_mode = 0;
                _AM.none_mode = 0;
            }
            //} else if (store.get_local(session_id, "read_mode") && parseInt(store.get_local(session_id, "read_mode"))) {
        } else if (("read_mode" in window._story_settings) && parseInt(window._story_settings["read_mode"])) {
            $('#sc_game_mode').val('Read').selectmenu('refresh');
            if (window._AM_loaded) {
                _AM.scramble_mode = 0;
                _AM.read_mode = 1;
                _AM.type_mode = 0;
                _AM.none_mode = 0;
            }
            //} else if (store.get_local(session_id, "type_mode") && parseInt(store.get_local(session_id, "type_mode"))) {
        } else if (("type_mode" in window._story_settings) && parseInt(window._story_settings["type_mode"])) {
            $('#sc_game_mode').val('Type').selectmenu('refresh');
            if (window._AM_loaded) {
                _AM.scramble_mode = 0;
                _AM.read_mode = 0;
                _AM.type_mode = 1;
                _AM.none_mode = 0;
            }

            //} else if (store.get_local(session_id, "none_mode") && parseInt(store.get_local(session_id, "none_mode"))) {
        } else if (("none_mode" in window._story_settings) && parseInt(window._story_settings["none_mode"])) {
            $('#sc_game_mode').val('None').selectmenu('refresh');
            if (window._AM_loaded) {
                _AM.scramble_mode = 0;
                _AM.read_mode = 0;
                _AM.type_mode = 0;
                _AM.none_mode = 1;
            }
        }

        $("#story_signin").popup("close");
        $('#go').text('Go');
        if (which_menu == "main") {
            menu_displayed = true;
            $("#story_main_menu").popup("open");
        } else {
            menu_displayed = true;
            $("#story_continue").popup("open");
        }
    } else {
        setTimeout(function () { readyCheck(); }, 1000);
    }
}

_AMI.signin = function signin() {
    $.ajax({
                type:"GET",
                url:_ajax_url_read_store_mongo + "/" + c1 + "/" + _story_name_settings, 
                success: function (data) {
                                        if (data != 'false') {
                                            //get all saved menu settings.
                                            window._story_settings = JSON.parse(data);
                                        }
                                        $('#pass').val('');

                                        __ready = 0;

                                        if (window._AM_loaded) {
                                            $("#story_signin").popup("close");
                                        }

                                        getAdventure_Mashup();
                                    
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    alert('[loading settings] Connection to server has failed.\nPlease try reloading the page.');                
                }
                });
}

function restore_menu_settings() {
    _AMI.save_story_settings();

    if (!("scramble_mode" in window._story_settings)) {
        //store.set_local(session_id, "scramble_mode", 1);
        window._story_settings["scramble_mode"] = 1;
    }
    _AM.scramble_mode = parseInt(window._story_settings["scramble_mode"]);

    if (!("audio_stream_volume" in window._story_settings)) {
        //store.set_local(session_id, "audio_stream_volume", 80);
        window._story_settings["audio_stream_volume"] = 80;
    }
    _AM.audio_stream_volume = parseFloat(window._story_settings["audio_stream_volume"]) / 100.00;

    if (!("video_stream_volume" in window._story_settings)) {
        //store.set_local(session_id, "video_stream_volume", 80);
        window._story_settings["video_stream_volume"] = 80;
    }
    _AM.video_stream_volume = parseFloat(window._story_settings["video_stream_volume"]) / 100.00;
}

/*function new_slot_change(event)
{
    slider_value = parseInt($("#slider-new").slider().val());
    set_slider_label("slider-new-prompt", slider_value);

    $("#slider-save").off();
    $("#slider-resume").off();

    $('#slider-save').val(slider_value).slider("refresh");
    $('#slider-resume').val(slider_value).slider("refresh");
    set_slider_label("slider-save-prompt", slider_value);
    set_slider_label("slider-resume-prompt", slider_value);
}*/

function save_slot_change(event) {
    slider_value = parseInt($("#slider-save").slider().val());
    set_slider_label("slider-save-prompt", slider_value);

    $("#slider-new").off();
    $("#slider-resume").off();

    $('#slider-new').val(slider_value).slider("refresh");
    $('#slider-resume').val(slider_value).slider("refresh");
    set_slider_label("slider-new-prompt", slider_value);
    set_slider_label("slider-resume-prompt", slider_value);
}

function resume_slot_change(event) {
    slider_value = parseInt($("#slider-resume").slider().val());
    set_slider_label("slider-resume-prompt", slider_value);

    $("#slider-new").off();
    $("#slider-save").off();

    $('#slider-new').val(slider_value).slider("refresh");
    $('#slider-save').val(slider_value).slider("refresh");
    set_slider_label("slider-new-prompt", slider_value);
    set_slider_label("slider-save-prompt", slider_value);

}

//menu functions.
_AMI.continue_story = function continue_story() {
    _AM.session_id = session_id;
    _AM.init_defaults(_AMI.catalog.width, _AMI.catalog.height, _AMI.catalog.fontSize, f1);
    restore_menu_settings();
    _AM.reset_AM();

    _AM.init();
    
    menu_displayed = false;
    $("#story_continue").popup("close");

    _AM.resume("auto_save", function () {
        $("#story").removeClass("background_div_landing");
        _AM.play(_AM.save_data.current_scene_name);
        _AM.set_audio_levels(_AM.audio_stream_volume, _AM.video_stream_volume);
    });

    /*$('#chapter').remove();
    var element = document.createElement("script");
    element.id = "chapter"
    element.src = "www/js/" + _AM.save_data.chapter[_AM.save_data.scene_path_idx];
    document.body.appendChild(element);*/

    /*var ii = setInterval(function () {
        if (_AM.ready) {
                            $("#story").removeClass("background_div_landing");                        
                            clearInterval(ii);
                            _AM.play(_AM.scenes[_AM.save_data.scene_path[_AM.save_data.scene_path_idx]], _AM.save_data.scene_path[_AM.save_data.scene_path_idx]);
                            //***TO DO: try setting volume here...
                            _AM.set_audio_levels(_AM.audio_stream_volume, _AM.video_stream_volume);
                        }
                        }, 250);   */

    //$("#story").removeClass("background_div_landing");

    //_AM.play(_AM.save_data.scene_path[_AM.save_data.scene_path_idx]);
    //***TO DO: try setting volume here...
    //_AM.set_audio_levels(_AM.audio_stream_volume, _AM.video_stream_volume);
}

function main_menu_exit() {
    menu_displayed = false;
    restore_menu_settings();

    $("#story_main_menu").popup("close");

    _AM.continue_scene();    
}


_AMI.cancel_continue = function cancel_continue() {
    //store.del(session_id, "auto_save");
    window._story_settings["auto_save"] = 0;
    //window.localStorage.removeItem(_story_name + "auto_save");
    menu_displayed = false;
    $("#story_continue").popup("close");

    scale = _AMI.get_scale();
    //flash click to start.
    start_div = document.createElement('div');
    start_div.setAttribute('id', 'story_div_image_play');
    start_div.setAttribute('class', 'story_div_image_flash');


    image = {};
    image.width = 340;
    image.height = 35;
    image.max_width = 340;
    image.max_height = 35;
    //image.src = _AM.image_path + 'speaker_icon_off.svg';
    start_div.setAttribute('style', 'top:50%; left:50%; margin-top:-' + (image.height * scale / 2.0) + 'px; margin-left:-' + (image.width * scale / 2.0) + 'px; width:' + (image.width * scale).toFixed(0) + 'px; height:' + (image.height * scale).toFixed(0) + "px; background-image: url('https://adventuremashup.com/images/_Logo_Adventure_Mashup_Site_With_Play.svg'); background-size: " + (image.max_width * scale).toFixed(0) + "px " + (image.max_height * scale).toFixed(0) + "px; background-position: 0px 0px; border-width:" + (4 * scale).toFixed(0) + "px; border-style:solid; border-color:#00D8CD;");
    //start_div.setAttribute('style', 'width:' + (image.width * s).toFixed(0) + 'px; height:' + (image.height * s).toFixed(0) + "px; background-image: url('/www/image/sentence_icon_off.svg'); background-size: " + (s * 100.00).toFixed(2) + "%; " + (s * 100.00).toFixed(2) + "%; ");
    //image_div.setAttribute('style', "left:" + (video_offset.left + (image.x * video_intrinsic_scale)) + "px; top:" + (video_offset.top + (image.y * video_intrinsic_scale)) + "px; width: 50px; height: 50px;" );
    start_div.setAttribute('onselectstart', 'return false;');
    start_div.setAttribute('ondragstart', 'return false;');

/*    image = {};
    image.width = 290;
    image.height = 50;
    image.max_width = 290;
    image.max_height = 50;
    //image.src = _AM.image_path + 'speaker_icon_off.svg';
    start_div.setAttribute('style', 'top:50%; left:50%; margin-top:-' + (image.height * scale / 2.0) + 'px; margin-left:-' + (image.width * scale / 2.0) + 'px; width:' + (image.width * scale).toFixed(0) + 'px; height:' + (image.height * scale).toFixed(0) + "px; background-image: url('http://adventuremashup.com/images/_Logo_Adventure_Mashup_Site_With_Play.svg'); background-size: " + (image.max_width * scale).toFixed(0) + "px " + (image.max_height * scale).toFixed(0) + "px; background-position: 0px 0px; border-width:" + (4 * scale).toFixed(0) + "px; border-style:solid; border-color:#00D8CD;");
    //start_div.setAttribute('style', 'width:' + (image.width * s).toFixed(0) + 'px; height:' + (image.height * s).toFixed(0) + "px; background-image: url('/www/image/sentence_icon_off.svg'); background-size: " + (s * 100.00).toFixed(2) + "%; " + (s * 100.00).toFixed(2) + "%; ");
    //image_div.setAttribute('style', "left:" + (video_offset.left + (image.x * video_intrinsic_scale)) + "px; top:" + (video_offset.top + (image.y * video_intrinsic_scale)) + "px; width: 50px; height: 50px;" );
    start_div.setAttribute('onselectstart', 'return false;');
    start_div.setAttribute('ondragstart', 'return false;');*/

    document.body.appendChild(start_div);
    //end click to start.
    //_AM.image_flash(start_div);

    which_menu = "main";
    $(document).on('click', function () {
        $(this).off('click'); $(start_div).stop(); $(start_div).remove();
        //$("#story").removeClass("background_div_landing");
        getAdventure_Mashup();
        /*if (session_id) {
            getAdventure_Mashup();
            //$("#story_main_menu").popup("open");
        } else {
            menu_displayed = true;
            $("#story_signin").popup("open");
        }*/
    });
}

_AMI.new_story = function new_story() {
    _AM.session_id = session_id;
    _AM.init_defaults(_AMI.catalog.width, _AMI.catalog.height, _AMI.catalog.fontSize, f1);
    restore_menu_settings();
    _AM.reset_AM();

    //window.localStorage.removeItem(_story_name + "auto_save");
    //store.del(session_id, "auto_save");
    window._story_settings["auto_save"] = 0;
    window._story_settings["save_slot"] = slider_value;
    //store.set_local(session_id, _story_name + "save_slot", slider_value);

    _AM.init_save_data();

    menu_displayed = false;
    $("#story_main_menu").popup("close");
    _AM.init();
    /*$('#chapter').remove();
    var element = document.createElement("script");
    element.id = "chapter"
    element.src = "www/js/chapter1.js";
    document.body.appendChild(element);*/

    /*var ii = setInterval(function () {
        if (_AM.ready) {
            $("#story").removeClass("background_div_landing");
            clearInterval(ii);

            
        }
    }, 250);*/
    $("#story").removeClass("background_div_landing");
    _AM.play(_AM.first_scene_name);
}

_AMI.save_story = function save_story() {
    window._story_settings["save_slot"] = slider_value;
    window._story_settings["save_slot_" + slider_value] = {};
    window._story_settings["save_slot_" + slider_value].scene_path_idx = _AM.save_data.scene_path_idx;
    window._story_settings["save_slot_" + slider_value].current_scene_name = _AM.save_data.current_scene_name;

    restore_menu_settings();
    //store.set(session_id, _story_name + "save_slot", slider_value);    
    _AM.save("save_slot_" + slider_value);

    main_menu_exit();
}

_AMI.resume_story = function resume_story() {
    if (!is_slot_empty(slider_value)) {
        window._story_settings["save_slot"] = slider_value;
        window._story_settings["auto_save"] = 0;        

        _AM.session_id = session_id;
        _AM.init_defaults(_AMI.catalog.width, _AMI.catalog.height, _AMI.catalog.fontSize, f1);
        //save story settings is in here.
        restore_menu_settings();
        _AM.reset_AM();

        _AM.resume("save_slot_" + slider_value, function () {
            $("#story").removeClass("background_div_landing");
            _AM.play(_AM.save_data.current_scene_name);
            _AM.set_audio_levels(_AM.audio_stream_volume, _AM.video_stream_volume);
        });

        //$("#story_continue").popup("close");
        menu_displayed = false;
        $("#story_main_menu").popup("close");
        _AM.init();

        /*restore_menu_settings();
        _AM.reset_AM();
        _AM.init();

        _AM.resume(_story_name + "save_slot_" + $('#slider-resume').val(), function () {
            $("#story").removeClass("background_div_landing");
            _AM.play(_AM.save_data.scene_path[_AM.save_data.scene_path_idx]);
            _AM.set_audio_levels(_AM.audio_stream_volume, _AM.video_stream_volume);
        });*/


    } else {
        //slot is empty, start a new story then.
        window._story_settings["save_slot"] = slider_value;
        window._story_settings["auto_save"] = 0;
        _AMI.save_story_settings();

        _AMI.new_story();
    }
}

function is_slot_empty(slider_value) {
    if (("save_slot_" + slider_value) in window._story_settings && window._story_settings["save_slot_" + slider_value] != null && window._story_settings["save_slot_" + slider_value] != "") {
        return false;
    } else {
        return true;
    }
}

function set_slider_label(label_id, slider_value) {
    //localStorage[_story_name + "save_slot"] = slider_value;           
    if (!is_slot_empty(slider_value)) {
        //$('#' + label_id).text("Save Slot:" + _AM.scenes[tmp.scene_path[tmp.scene_path_idx]].name + ', # of scenes:' + tmp.scene_path.length);
        //dont have the information for name as _AM.scenes might not be loaded, and dont know which chapter file to use.
        //would have to add the name to the save data object if we want to have it.
        //$('#' + label_id).text("Save Slot:" + tmp.current_scene_name + ' # of scenes:' + tmp.scene_path.length);
        if (window._story_settings["save_slot_" + slider_value].scene_path_idx + 1 > 1) {
            $('#' + label_id).text("Save Slot: " + (window._story_settings["save_slot_" + slider_value].scene_path_idx) + " scenes into story.");
        } else {
            $('#' + label_id).text("Save Slot: " + (window._story_settings["save_slot_" + slider_value].scene_path_idx) + " scene into story.");
        }
    } else {
        $('#' + label_id).text("Save Slot: Empty");
    }
}
}(window._AMI = window._AMI || {}, jQuery));
window._AMI_loaded = true;

