/* Copyright (C) Richard Chapman - All Rights Reserved 
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Richard Chapman, 2014
 * This file is only allowed to be hosted and served by AdventureMashup.com and only allowed to be used within a AdventureMashup.com product.
    
    <!--*IMPORTANT NOTE* VIDEO CAN NOT PLAY SAME FILE AT SAME TIME IN CHROME- WHILE CACHING. - HAS TO BE DIFFERENT FILES -->
    <!--Currently IIS is set up to have a virtual folder for video2.-->
    <!--IE does not support localStorage when the resource is accessed from local file system... booo-->

 */
(function (_AM, $, undefined) {
    _AM.editor = false;
    _AM.speech_match_threshold = 0.80;
    _AM.speech_result;
    _AM.speech_interim;
    _AM.catalog = {};
    _AM.images = {}

    _AM.add_image = function add_image(scene_image)
    {
        _AM.images[scene_image.title] = scene_image;
    }

    _AM.remove_image = function remove_image(unique_id)
    {
        delete _AM.images[unique_id];
    }

    _AM.scene_sync_video_time = 1.0;  // time in seconds allotted at end of video for syncing to next scene, or for loop back.
    _AM.scene_cache_video_time = 1.0; // time in seconds allotted for loading next scene.
    //the following is now set in the css style.
    //var scene_fade_video_time = 1000; // time in milliseconds to fade to other video, this is default and overrideable.
    var scene_cache_audio_time = 2.0; // time in seconds allotted for loading next sentence audio.
    _AM.scene_text_hor_spacing = 3; // pixels spacing above and below text.
    _AM.scene_text_ver_spacing = 0; // pixels spacing between words.
    var scene_fade_text_time_remove_delay = 1100; //needs to be longer than the css transition time applied.
    var scene_move_text_time = 800;    

    //var __debug = 1;
    //_AM.ready = false;
    //_AM.current_chapter;
    _AM.image_path;
    _AM.iframe_path;
    _AM.audio_path;
    _AM.video_path_1;
    _AM.video_path_2;    

    //used by splice_audio. - should be private properties.
    //*_vol_graph format = [[t1,v1],[t2,v2],[t3,v3]]; where t is the start time and v is the volume, linear approximation is made between the specified points.
    _AM.inc_vol_graph;
    _AM.dec_vol_graph;

    _AM.scramble_mode;
    _AM.read_mode;
    _AM.type_mode;
    _AM.none_mode;

    _AM.audio_stream_volume;
    _AM.video_stream_volume;

    _AM.max_save;
    _AM.save_data = {};         //object that contains all data that needs to be saved/restored for preserving story progress.

    //*** PRIVATE VARIABLES ***//  
    _AM.editor_svg_margin = 20.0;

    var current_scene; //the current scene object.    

    _AM.scene_paused;
    _AM.playing;           //is the story framework playing.
    var scene_switching;   //is the story framework in the middle of switching scenes.
    var is_audio_playing;  //is an audio element already playing.

    var scene_fine_engine_handle;
    var scene_coarse_engine_handle;        

    var video_offset;
    
    _AM.scenes = [];
    var cache_scene_idx; //this points to the current active cache, during a scene change, this still points to the current scene until goto is passed in the timeline.


    _AM.video_streams = [];   //create the array to store the _AM.video_streams - 2 streams only - one buffer and one currently playing.
    _AM.command_bar = null;
    var video_stream_idx; //currently active video player.

    var audio_streams = [];   //create the array to store the audio_streams - 4 streams only - one for current word, one for next word, one for sentence and one for word click/press.
    
    var audio_streams_is_precache = [];
    var audio_stream_idx; //currently active audio player for next.
    var audio_streams_cache_invalidated;
    var audio_stream_max; //positions 0 to 2 including 2, set int reset_AM

    var audio_effects = [];   //used to store audio effects. IE please start supporting WEB API *sigh*    
    var audio_effect_max; //set in reset_AM
    var audio_effect_idx; //last audio player used for effect.

    var audio_stream_sentence_idx;
    var audio_stream_on_demand_word_idx;

    //used to store all time id's for a clear all timers function - this means a limit of max 20 timers can be running at the same time.
    var all_timers = new Array(20);
    var timer_slot = 0;

    var splicing_audio = false;
    var syncing_video = false;

    _AM.set_current_scene = function set_current_scene(this_scene){
        current_scene = this_scene;
    }

    //used to restore _AM and it's dom modifications back to its inital state.
    _AM.reset_AM = function reset_AM() {
        _AM.clearTimers();
        _AM.stop();
        syncing_video = false;

        //reset scenes if we have any.
        /*if (_AM.scenes) {
            for (i = 0; i < _AM.scenes.length; i++) {
                for (s = 0; s < _AM.scenes[i].sentences.length; s++) {
                    _AM.scenes[i].sentences[s].reset();
                }

                for (ii = 0; ii < _AM.scenes[i].images.length; ii++) {
                    _AM.scenes[i].images[ii].reset();
                }
            }
        }*/

        var pardiv;
        //remove video streams from DOM.
        if (_AM.video_streams) {
            for (i = 0; i < _AM.video_streams.length; i++) {
                pardiv = _AM.video_streams[i].parentNode;
                $(_AM.video_streams[i]).remove();
                $(pardiv).remove();
            }
        }
        //remove audio streams from DOM.
        if (audio_streams) {
            for (i = 0; i < audio_streams.length; i++) {
                $(audio_streams[i]).remove();
            }
        }

        //remove audio effects from DOM.
        if (audio_effects) {
            for (i = 0; i < audio_effects.length; i++) {
                $(audio_effects[i]).remove();
            }
        }        

        //remove command bar from DOM.
        if (_AM.command_bar) {
            $(_AM.command_bar).remove();
        }

        //remove stored images
        _AM.images = {};

        //clean the svg_canvas element.    
        if (_AM.svg_container) {
            while (_AM.svg_container.hasChildNodes()) {
                _AM.svg_container.removeChild(_AM.svg_container.lastChild);
            }

            pardiv = _AM.svg_container.parentNode;
            $(_AM.svg_container).remove();
            $(pardiv).remove();
        }

        //clear iFrames.
        var iframes = document.getElementsByTagName('iframe');
        for (var i = 0; i < iframes.length; i++) {
            iframes[i].parentNode.removeChild(iframes[i]);
        }

        //hmmm do i reset the next 3???
        //__debug = 1;
        //_AM.scramble_mode = 1;

        _AM.save_data = {}; 

        //restore initial variable settings.
        //_AM.ready = false;        
        //_AM.current_chapter = "";
        /*_AM.image_path = "image/";
        _AM.audio_path = "audio/";
        _AM.video_path_1 = "video1/";
        _AM.video_path_2 = "video2/";   */    
        //used by splice_audio. - should be private properties.
        //*_vol_graph format = [[t1,v1],[t2,v2],[t3,v3]]; where t is the start time and v is the volume, linear approximation is made between the specified points.
        _AM.inc_vol_graph = [[0.0, 0.0], [2.0, 1.0]];
        _AM.dec_vol_graph = [[0.0, 1.0], [2.0, 0.0]];
        //_AM.audio_stream_volume = 1.0;
        //_AM.video_stream_volume = 1.0;
        _AM.max_save = 10;
        //_AM.scenes = [];

        current_scene = null; //the current scene object.    

        _AM.playing = 0;           //is the story framework playing.
        scene_switching = 0;   //is the story framework in the middle of switching scenes.
        is_audio_playing = 0;  //is an audio element already playing.

        scene_fine_engine_handle = null;
        scene_coarse_engine_handle = null;

        /*
        _AM.html_container = null;
        video_intrinsic_width = -1; //in pixels.
        video_intrinsic_height = -1;
        _AM.video_intrinsic_font_size = -1;
        video_intrinsic_scale = -1; //in pixels - calculated.
        */

        video_offset = {};

        _AM.video_streams = [];   //create the array to store the _AM.video_streams - 2 streams only - one buffer and one currently playing.
        video_stream_idx = 0; //currently active video player.

        audio_streams = [];   //create the array to store the audio_streams - 4 streams only - one for current word, one for next word, one for sentence and one for word click/press.
        audio_streams_is_precache = [];
        audio_stream_idx = 0; //currently active audio player for next.
        audio_streams_cache_invalidated = true;

        audio_stream_max = 3; //positions 0 to 2 including 2
        audio_stream_sentence_idx = 3;
        audio_stream_on_demand_word_idx = 4;

        audio_effects = [];
        audio_effect_max = 4; //max 4 sound effects played together.
        audio_effect_idx = 0;

        all_timers = new Array(20);
        timer_slot = 0;
    }

    _AM.pause_scene = function pause_scene()
    {        
        if (scene_switching != 2 && scene_switching != 3 && !scene_fine_engine_handle) {
            _AM.scene_paused = 1;
            //need to stop images that are displayed from flashing.
            _AM.video_streams[video_stream_idx][yiu]();

            //stop all timers
            _AM.clearTimers();
        } else {
            setTimeout(function () { if (!_AM.scene_paused) { _AM.pause_scene(); } }, 250);
        }
    }

    _AM.continue_scene = function continue_scene()
    {
        _AM.scene_paused = 0;
        _AM.video_streams[video_stream_idx][alb]();
        scene_coarse_engine_handle = _AM.setInterval(scene_coarse_engine, 250);

        //start image animations again.
        var test_image;
        for (var key in _AM.images) {
            if (_AM.images.hasOwnProperty(key)) {
                test_image = _AM.images[key];
                //if (test_image.scene_title == current_scene.name) {
                    if (test_image.triggered){ // && _AM.video_streams[video_stream_idx][ren] >= test_image[ou] && _AM.video_streams[video_stream_idx][ren] < test_image[uo]) {
                        //image needs to be animating if it has an animation.
                        if (test_image.is_animating) {
                            animate_image_helper(test_image);
                        }

                        //image needs to be flashing if its set to flash.
                        if (test_image.flash) {
                            _AM.image_flash(test_image.image_svg_group);
                        }
                    }
                //}
                
            }
        }
    }

    /*
_AM.bag_add(name_item, can_see, quantity, can_be_negative)
{
    if (name_item in this.bag) {
        this.bag[name_item].qty += quantity;
    } else {
        this.bag[name_item] = {};
        this.bag[name_item].qty = quantity;
    }

    this.bag[name_item].can_see = can_see;
    if (can_be_negative) {
        this.bag[name_item].can_be_negative = true;
    } else {
        this.bag[name_item].can_be_negative = false;
    }
}


_AM.bag_remove(name_item, can_see, quantity, can_be_negative)
{
    if (name_item in this.bag) {
        this.bag[name_item].qty -= quantity;
    } else {
        this.bag[name_item] = {};
        this.bag[name_item].qty = quantity;
    }

    this.bag[name_item].can_see = can_see;
    if (can_be_negative) {
        this.bag[name_item].can_be_negative = true;
    } else {
        this.bag[name_item].can_be_negative = false;
    }
}
*/

    //use negative numbers for remove
    //assumes value pairs name_item:quantity seperated by commas - item names cannot have a comma
    //pair of shoes:5,sword:1,trench_suite:3;
    //can_be_negative is not actually enforced.
    _AM.bag_add_remove_original = function bag_add_remove_original(name_item_qty_str, can_see, can_be_negative) {
        item_pairs = name_item_qty_str.split(',');

        for (i = 0; i < item_pairs.length; i++) {
            var item_value = $.trim(item_pairs[i]).split(':');

            if (item_value[0] in _AM.save_data.bag) {
                _AM.save_data.bag[item_value[0]].qty += item_value[1];
            } else {
                _AM.save_data.bag[item_value[0]] = {};
                _AM.save_data.bag[item_value[0]].qty = item_value[1];
            }

            _AM.save_data.bag[item_value[0]].can_see = can_see;
            if (can_be_negative) {
                _AM.save_data.bag[item_value[0]].can_be_negative = true;
            } else {
                _AM.save_data.bag[item_value[0]].can_be_negative = false;
            }
        }
    }

    _AM.bag_add_remove = function bag_add_remove(name_item_qty_str, can_see, can_be_negative) {        
        if (name_item_qty_str.indexOf(';') > -1)
        {
            //can_see will end up being determined if there is an image with same name as variable. can_be_negative is ignored.
            
            //string is of form variable += 5; variable -=3; variable='hello';
            

            name_item_qty_str = ' ' + name_item_qty_str; //.replace(/and/ig, '&&').replace(/or/ig, '||').replace(/\"/g, '\'').replace(/&amp;lt;/g, '<').replace(/&amp;gt;/g, '>');            
            name_item_qty_str = name_item_qty_str.replace(/[\s\(\)=]([a-zA-Z_][a-zA-Z0-9_]*)/g, " _AM.save_data.bag['$1'] ");
            (new Function(name_item_qty_str))();
        } else {
            _AM.bag_add_remove_original(name_item_qty_str, can_see, can_be_negative)
        }
    }

    _AM.check_bag = function check_bag(name_item_qty_str) {
        var item_pairs;
        if (name_item_qty_str.indexOf(':') > -1) {
            item_pairs = name_item_qty_str.split(',')
            return _AM.check_bag_original(item_pairs);
        } else {
            if (_AM.editor) {
                return true;
            } else {
                //then assume full logic string.
                //replace AND, OR with && ||
                name_item_qty_str = ' ' + name_item_qty_str.replace(/and/ig, '&&').replace(/or/ig, '||').replace(/\"/g, '\'').replace(/&amp;lt;/g, '<').replace(/&amp;gt;/g, '>');
                name_item_qty_str = 'var err; var res=false; try { res = (' + name_item_qty_str.replace(/[\s\(\)]([a-zA-Z_][a-zA-Z0-9_]*)/g, " _AM.save_data.bag['$1']") + '); }catch(err){}finally{return res;}';
                return (new Function(name_item_qty_str))();                
            }
        }
    }
    //assumes value pairs name_item:quantity seperated by commas - item names cannot have a comma
    //pair of shoes:5,sword:1,trench_suite:3;
    _AM.check_bag_original = function check_bag_original(item_pairs) {
        if (_AM.editor) {
            return true;
        }        
        res = true;
        var i;
        for (i = 0; i < item_pairs.length; i++) {
            var item_value = $.trim(item_pairs[i]).split(':');

            if (item_value.length > 0) {
                if (!(item_value[0] in _AM.save_data.bag)) {
                    if (parseInt(item_value[1]) != 0) { //if the requirement was 0, not having it in the bag is zero.                    
                        res = false;
                        break;
                    }                    
                } else {
                    //check the quantity.                
                    if (parseInt(item_value[1]) == 0) { //zero is special compared to the other numbers.
                        if (_AM.save_data.bag[item_value[0]].qty > parseInt(item_value[1])) {
                            res = false;
                            break;
                        }
                    } else {
                        //requirement is none zero so having anything less than requirement is not enough.
                        if (_AM.save_data.bag[item_value[0]].qty < parseInt(item_value[1])) {
                            res = false;
                            break;
                        }
                    }
                }
            }
        }

        return res;
    }

    function Init_save_data()
    {
        if (!(this instanceof arguments.callee))
            throw new Error("Init_save_data constructor called as a function");

        //this.scene_path = [];     //sequence of scenes currently played.
        this.current_scene_name = "";
        this.scene_path_idx = 0;  //current position in scene_path. - might have hit go back... etc.
        this.bag = {};            //inventory bag - sentances can also check... but these are more user modifyable.
        this.karma = 0;           //current count of karma from sentences chosen. 
        this.images = "";
    }

    _AM.init_save_data = function init_save_data()
    {
        _AM.save_data = new Init_save_data();                
    }
    

    _AM.update_save_data = function update_save_data(to_scene_name)
    {
        _AM.save_data.scene_path_idx++; // _AM.save_data.scene_path.length;

        _AM.save_data.current_scene_name = to_scene_name;
        
        
        /*var new_image = _AM.images[key];

        _AM.images[key].scene_title;
        new_image.is_displayed = test_image.is_displayed;
        new_image.triggered = test_image.triggered;
        new_image[ou] = test_image[ou];
        new_image[kl] = test_image[kl];
        new_image[uo] = test_image[uo];

        new_image.sent_revealed_idx = test_image.sent_revealed_idx;
        new_image.sent_is_complete = test_image.sent_is_complete;
        new_image.is_animating = test_image.is_animating;
        new_image.loop_animate = test_image.loop_animate;
        */

        _AM.save_data.images = '';
        var tmp_obj = {};
        var tmp_imgs = {};
        _AM.save_data.images = JSON.stringify(_AM.images);
        for (var key in _AM.images) {
            if (_AM.images.hasOwnProperty(key)) {
                test_image = _AM.images[key];
                tmp_obj = {};
                tmp_obj.scene_title = test_image.scene_title;
                tmp_obj.is_displayed = test_image.is_displayed;
                tmp_obj.triggered = test_image.triggered;
                tmp_obj[ou] = test_image[ou];
                tmp_obj[kl] = test_image[kl];
                tmp_obj[uo] = test_image[uo];

                tmp_obj.sent_revealed_idx = test_image.sent_revealed_idx;
                tmp_obj.sent_is_complete = test_image.sent_is_complete;
                tmp_obj.is_animating = test_image.is_animating;
                tmp_obj.loop_animate = test_image.loop_animate;

                tmp_imgs[key] = (JSON.parse(JSON.stringify(tmp_obj)));
            }
        }
        _AM.save_data.images = JSON.stringify(tmp_imgs);
        //_AM.save_data.images = JSON.stringify(_AM.images); //convert the current images object into a string JSON representation.
        
        //***TO DO: verify this works for saving the path.

        /*if (_AM.save_data.scene_path.length > 0 && _AM.save_data.scene_path[(len - 1) % _AM.max_save] != current_scene.name) {
            //we had already updated the next scene.
            _AM.save_data.scene_path[(len - 1) % _AM.max_save] = to_scene_name;
            
        } else {
            _AM.save_data.scene_path_idx++;
            _AM.save_data.scene_path[len % _AM.max_save] = to_scene_name;
            
        }*/
    }

    _AM.auto_save = function auto_save()
    {
        if ("auto_save" in window._story_settings && !window._story_settings["auto_save"]) {
            window._story_settings["auto_save"] = 1;
            store.set(_story_name_settings, JSON.stringify(window._story_settings));
        }
        store.set("auto_save", JSON.stringify(_AM.save_data));
    }

    _AM.save = function save(store_key)
    {
        if (store_key) {
            //store.set("save_slot", slot);
            store.set(store_key, JSON.stringify(_AM.save_data));
        }
    }

    function resume_helper(imgs, reqs, func) {
        var res = true;
        for (var key in reqs) {
            if (reqs.hasOwnProperty(key)) {
                if (reqs[key] == false) {
                    res = false;
                    break;
                }
            }
        }
        
        if (res == true) {
            //all requests met
            _AM.scene_paused = 0;
            //remove images that are extras, included by scene but had been removed when the save was later called.
            
            //now add the images that are displayed.
            for (var key in imgs) {
                if (imgs.hasOwnProperty(key)) {
                    var test_image = imgs[key];

                    //update some import image information.
                    var new_image = _AM.images[key];
                    
                    new_image.is_displayed = test_image.is_displayed;
                    new_image.triggered = test_image.triggered;
                    new_image[ou] = test_image[ou];
                    new_image[kl] = test_image[kl];
                    new_image[uo] = test_image[uo];
                
                    new_image.sent_revealed_idx = test_image.sent_revealed_idx;
                    new_image.sent_is_complete = test_image.sent_is_complete;
                    new_image.is_animating = test_image.is_animating;
                    new_image.loop_animate = test_image.loop_animate;
                    
                    if (new_image.is_displayed) {
                        add_image_to_display(new_image);
                    }

                    //animate the image.
                    if (test_image.is_animating) {
                        animate_image_helper(new_image);
                    }
                }
            }

            //delete keys from image that are not needed.
            for (var key in _AM.images) {
                if (_AM.images.hasOwnProperty(key)) {
                    if(!(key in imgs))
                    {
                        delete _AM.images[key];
                    }
                }
            }

            func();
        }
    }

    //***TODO: TEST
    _AM.resume = function resume(store_key, callbackfunc) {
        if ((typeof (bz) == 'undefined')) {
            iin(function () { resume(store_key, callbackfunc); });
        }else if (store_key) {
            //_AM.save_data = JSON.parse(store.get(_AM.session_id, store_key));

            //var slot = store.get("save_slot");            
            //there was already a save slot selected, make it active.            
            store.get(store_key,
                function (data) {
                    if (data != null && data != '') {
                        _AM.save_data = JSON.parse(data);
                    }
                    //now I need to load the .images array back in.
                    var imgs = {}
                    if (_AM.save_data.images != "") {
                        imgs = JSON.parse(_AM.save_data.images);

                        var reqs = {};
                        //now I need to load the scenes in that created these images.
                        for (var key in imgs) {
                            if (imgs.hasOwnProperty(key)) {
                                var test_image = imgs[key];

                                //test_image.scene_title == current_scene.name
                                if (!(test_image.scene_title in reqs)) {
                                    //request and execute the scenes.
                                    reqs[test_image.scene_title] = false;
                                    /*
                                    $.ajax({
                                        type: "GET",
                                        url: _ajax_url_precache + "/" + c1 + "/" + _AM.session_id + "/" + test_image.scene_title,
                                        scene_title: test_image.scene_title,
                                        success: function (data) {
                                            if (data != "false") {
                                                reqs[this.scene_title] = true; //*****does test_image make it in here or because of for loop its always the last test_image value????
                                                (new Function(data))(); //window[current_scene.precache_scenes[i]]();
                                                resume_helper(imgs, reqs, callbackfunc);
                                            } else {
                                                //signin(); //should be defined in index.html
                                                _AMI.show_sign_in();
                                            }
                                        },

                                        error: function (jqXHR, textStatus, errorThrown) {
                                            alert('Connection to server has failed.\nPlease try reloading the page.');
                                            console.log(textStatus);
                                            console.log(errorThrown);
                                            console.log(jqXHR);
                                        }
                                    });
                                    */

                                   $.ajax({
                                        type: "GET",
                                        url: _ajax_url_read_scene_mongo + "/" + c1 + "/" + test_image.scene_title,
                                        scene_title: test_image.scene_title,
                                        success: function (data) {
                                            if (data != "false") {
                                                reqs[this.scene_title] = true; //*****does test_image make it in here or because of for loop its always the last test_image value????
                                                //(new Function(data))(); //window[current_scene.precache_scenes[i]]();
                                                //we don't need the scenes... just need the images added to the global image array.                                                                                         
                                                //go through the images.
                                                _AM.images_wireup(data.images);

                                                resume_helper(imgs, reqs, callbackfunc);
                                            } else {
                                                //signin(); //should be defined in index.html
                                                _AMI.show_sign_in();
                                            }
                                        },

                                        error: function (jqXHR, textStatus, errorThrown) {
                                            alert('Connection to server has failed.\nPlease try reloading the page.');
                                            console.log(textStatus);
                                            console.log(errorThrown);
                                            console.log(jqXHR);
                                        }
                                    });

                                }
                            }
                        }
                    } else {
                        //no images to restore.
                        setTimeout(callbackfunc, 500);
                    }

                });
        }
    }    

    /*_AM.resume_auto_save = function resume_auto_save()
    {
        _AM.save_data = JSON.parse(store.get("auto_save"));
    }*/

    _AM.setInterval = function (func, interval)
    {
        var i = setInterval(func, interval);
        all_timers[timer_slot % all_timers.length] = i;
        timer_slot++;
        return i;
    }

    _AM.setTimeout = function (func, interval)
    {
        var i = setTimeout(func, interval);
        all_timers[timer_slot % all_timers.length] = i;
        timer_slot++;
        return i;
    }

    _AM.clearTimers = function ()
    {
        var l = all_timers.length;
        for (i = 0; i < l; i++)
        {
            clearInterval(i % l);
            clearTimeout(i % l);
        }
    }
   

    function reset_scene_switching()
    {
        //debug_log('[reset_scene_switching: loop back or scene change complete.');
        //console.log("reset_scene_switching");
        scene_switching = 0;
        scene_coarse_engine_handle = _AM.setInterval(scene_coarse_engine, 250);
    }

    function scene_fine_engine()
    {
        //console.log("fine_engine: running");
        if (scene_switching == 3 && _AM.video_streams[video_stream_idx][ren] >= current_scene[op])
        {
            //LOOP BACK.
            clearInterval(scene_coarse_engine_handle);
            clearInterval(scene_fine_engine_handle);
            scene_coarse_engine_handle = null;
            scene_fine_engine_handle = null;
            set_active_video_stream(_AM.video_streams[video_stream_idx], _AM.video_streams[!video_stream_idx & 1], !video_stream_idx & 1, false, current_scene.apply_loop_fade);            
            //remember video streams are now reversed!
            splice_audio(_AM.video_streams[!video_stream_idx & 1], _AM.dec_vol_graph, _AM.video_streams[video_stream_idx], _AM.inc_vol_graph, reset_scene_switching);            
           
        } else if (scene_switching == 2 && _AM.video_streams[video_stream_idx][ren] >= current_scene[uo])
        {
            //SCENE CHANGE.
            clearInterval(scene_coarse_engine_handle);            
            clearInterval(scene_fine_engine_handle);
            scene_coarse_engine_handle = null;
            scene_fine_engine_handle = null;
            set_active_video_stream(_AM.video_streams[video_stream_idx], _AM.video_streams[!video_stream_idx & 1], !video_stream_idx & 1, true, current_scene.next_scene.apply_scene_fade);
            //remember video streams are now reversed!
            splice_audio(_AM.video_streams[!video_stream_idx & 1], _AM.dec_vol_graph, _AM.video_streams[video_stream_idx], _AM.inc_vol_graph, reset_scene_switching);                     
        }
        
    }

    function scene_synced_loop()
    {
        //console.log("scene_synced_loop: ");
        if (current_scene.next_scene != null && current_scene.change_scene_called) {
            //console.log("scene_synced_loop: scene switching set to 0");
            scene_switching = 0; //coarse engine will handle the rest.
        } else {
            scene_fine_engine_handle = _AM.setInterval(scene_fine_engine, 25);
        }
    }

    function scene_synced_new_scene() {
        //console.log("scene_synced_new_scene: ");
        scene_fine_engine_handle = _AM.setInterval(scene_fine_engine, 25);        
    }

    _AM.image_wireup = function image_wireup(scene_image){
      _AM.images[scene_image.title] = scene_image;

        scene_image.sent_input_idx = 0;
        scene_image.sent_input = [];

        //build sentence for speech type compare
        if (scene_image.sent) {
            for (var l = 0; l < scene_image.sent.disp.length; l++) {
                for (var i = 0; i < scene_image.sent.disp[l].length; i++) {
                    scene_image.sent_input.push(scene_image.sent.disp[l][i]);                  
                }
            }
        } else {
            scene_image.sent_input = [];
        }

        //these get calculated later.
        scene_image.sent_height = 0;
        scene_image.sent_text_tale_height = 0;
        //this.sent_top = 0;

        //this.coords = coords.split(",");
        //this.func = func; //the javascript function that is called when the item is touched.
                            //probably a limited set to choose from, item go to bag function, or a fast change scene/cut scene.
        scene_image.triggered = false;
        scene_image.is_displayed = false;
        scene_image.perm_hide = false;
        //this.image_div = null;
        //this.image_img = null;
        scene_image.image_svg = null;
        scene_image.image_svg_path = null;        
                
        //now its triggered change the time so its always triggered, for start...
        if (scene_image.animate_shape && scene_image.animate_shape[scene_image.animate_shape.length - 1]) {
            scene_image.animate_duration = scene_image.animate_shape[scene_image.animate_shape.length - 1].time; // - this[ou];
        }

        scene_image.is_animating = false;
  
      //build functions.
      $(_AM.images[scene_image.title]).on('on_selected', function(e,obj){
        if(e.currentTarget.prop_bag != null && e.currentTarget.prop_bag != "")
        {
            _AM.bag_add_remove(e.currentTarget.prop_bag, true, false);
            _AM.display_missing_image_group(e.currentTarget.image_group);                
        }

        if (e.currentTarget.prop_bag_scene_change != null && e.currentTarget.prop_bag_scene_change != "")
        {
            $(s).on('on_hide', function (e, obj) {
                _AM.bag_add_remove(e.currentTarget.prop_bag_scene_change, true, false);                        
            });                   
        }

        //if hide all images
        if(e.currentTarget.hide_all_images == 1)
        {
            _AM.hide_images(false, null, true);
        }

        //if done waiting
        if(e.currentTarget.done_waiting == 1){
            _AM.continue_scene();
        }

        if (e.currentTarget.fkuidGroup_t_catalog_to_scene != null && e.currentTarget.fkuidGroup_t_catalog_to_scene != '')
        {
            //has as scene change, what type...
            if(e.currentTarget.to_scene_from == 0){
                //cut scene.                         
                    if (e.currentTarget.to_scene_goto != 0)
                    {
                        _AM.cut_scene(e.currentTarget.fkuidGroup_t_catalog_to_scene,e.currentTarget.to_scene_goto);
                    }
                    else
                    {
                        _AM.cut_scene(e.currentTarget.fkuidGroup_t_catalog_to_scene);
                    }
            }else{
                //change scene.
                if(e.currentTarget.to_scene_goto != 0){
                    _AM.change_scene(e.currentTarget.fkuidGroup_t_catalog_to_scene,e.currentTarget.to_scene_from, e.currentTarget.to_scene_goto);
                }else{
                    _AM.change_scene(e.currentTarget.fkuidGroup_t_catalog_to_scene,e.currentTarget.to_scene_from);
                }
            }                    
        }

        if(e.currentTarget.sent == null){
            _AM.hide_image(this, null, true);
        }

        if (e.currentTarget.image_select_sound != null)
        {
            _AM.play_effect(e.currentTarget.image_select_sound);
        }

        if (e.currentTarget.image_select_func != null && e.currentTarget.image_select_func != '')
        {
            //was (new Function(e.currentTarget.image_select_func.Replace('\n', '')))();
            (new Function(e.currentTarget.image_select_func))();
        }
      });      
            
      $(_AM.images[scene_image.title]).on('on_show', function (e, obj) { 
        if (e.currentTarget.pause_while_wait == 1)
        {
            _AM.pause_scene();
        }

        if (e.currentTarget.image_show_sound != null)
        {
            _AM.play_effect(e.currentTarget.image_show_sound);
        }

        if (e.currentTarget.image_show_func != null)
        {
            (new Function(e.currentTarget.image_show_func))();
        }

      });

      $(_AM.images[scene_image.title]).on('on_hide', function (e, obj) {
            if (e.currentTarget.image_hide_func != null && e.currentTarget.image_hide_func != '')
            {
                (new Function(e.currentTarget.image_hide_func))();
            }
       });
    }

    _AM.images_wireup = function images_wireup(images){
        for (var key in images) {
            if (images.hasOwnProperty(key)) {          
                _AM.image_wireup(images[key]);                
            }
        }
    }

    _AM.scene_wireup = function scene_wireup(s)
    {
        console.log(s);
        //wire up scene.
        s.video_src1 = _AM.video_path_1 + s.video_src; //video source used for the scene, 1 video per scene.
        s.video_src1_is_precached = false;
        s.video_src2 = _AM.video_path_2 + s.video_src;
        s.video_src2_is_precached = false;    

        s.next_scene_time_precache = s.end_time - (_AM.scene_cache_video_time + _AM.scene_sync_video_time);
        s.next_scene_time = s.end_time - (_AM.scene_sync_video_time);
        s.next_scene_goto = null;

        s.change_scene_called = false;

        s.is_loop = true;
        s.is_loop_ready = false;
        
        if (s.apply_scene_fade != null) {
            //this.apply_scene_fade = apply_scene_fade;
        } else {
            s.apply_scene_fade = true; //scene_fade_video_time;
        }

        if (s.apply_loop_fade != null) {
            //this.apply_loop_fade = apply_loop_fade
        } else {
            s.apply_loop_fade = true; //scene_fade_video_time; //default it.
        }

        //this.sentences = [];       //used to store the sentence objects of the scene. 
        
        //this.sentence_idx;     //currently focused sentence.
        //this.current_sentence;

        //this.images = [];
        //this.current_image;
        //this.current_image_idx;

        s.iframes = [];

        if (s.scene_hide_func != null && s.scene_hide_func != '')
        {
            $(s).on('on_hide', function (e, obj) {
              (new Function(e.currentTarget.scene_hide_func))();
            });
        }

        if (s.end_scene == 1 || (s.scene_show_func != null && s.scene_show_func != ''))
        {
            $(s).on('on_show', function (e, obj) {
                if (e.currentTarget.end_scene == 1)
                {
                    e.currentTarget.is_loop = false;
                }
                if (e.currentTarget.scene_show_func != null)
                {
                    (new Function(e.currentTarget.scene_show_func))();
                }
            });
        }

        //wire up scenes images.
        _AM.images_wireup(s.images);
    }

    _AM.scene_coarse_engine_editor = function scene_coarse_engine_editor(image_group) {
        vid_stream = _AM.video_streams[video_stream_idx];
        var test_image;
        for (var key in _AM.images) {
            if (_AM.images.hasOwnProperty(key)) {
                test_image = _AM.images[key];
                if (test_image.scene_title == current_scene.title) { //only controls timing on images added in the current scene.
                    if ((vid_stream[ren] >= test_image[ou] || vid_stream.duration <= test_image[ou]) && vid_stream[ren] < test_image[uo]
                        && (!image_group || test_image.image_group == image_group)) {
                        if (!test_image.triggered && !test_image.perm_hide) {
                            //add image.
                            _AM.display_image_group(test_image.image_group, "fast");
                        }
                        //if an add was missed because of requirements and is later available for add because of requirements met, different function must be called by event.
                        //too intensive to check here.
                    } else if ((test_image.triggered && vid_stream[ren] < test_image[ou] && test_image[ou] < vid_stream.duration) || (test_image.triggered && vid_stream[ren] >= test_image[uo])) {
                        //remove image.
                        
                            test_image.triggered = false;
                            test_image.is_displayed = false;
                            $(test_image).trigger("on_hide", { typ: "scene_image", scene_image: test_image });
                            //$(test_image.image_div).fadeOut("fast", function () { $(this).stop(); $(this).remove(); });                        
                            test_image.image_svg_group.setAttributeNS(null, 'class', test_image.animate_shape_class + '_hide');
                            remove_image(test_image, null);
                            //setTimeout(function () { $(test_image.image_svg_group).remove(); }, scene_fade_text_time_remove_delay);
                        
                    }
                }
            }
        }
    }

    //loop back goto has to be greater than the time to sync.
    function scene_coarse_engine()
    {
        var vid_stream = _AM.video_streams[video_stream_idx];
        //sometimes this gets called even when its not updating...
        if (!vid_stream[ss]) {
            //console.log("coarse_engine: running");
            //responsible for starting scene_fine_engine for processing assets and moving to next scene.
            switch_video_stream_time_precache = current_scene[op] - (_AM.scene_cache_video_time + _AM.scene_sync_video_time);
            switch_video_stream_time = current_scene[op] - _AM.scene_sync_video_time;

            //if (!current_scene.is_scenes_precached && vid_stream[ren] >= current_scene[ew] && current_scene.precache_scenes != null)
            //&& vid_stream[ren] >= current_scene[ew] - (_AM.scene_cache_video_time + _AM.scene_sync_video_time)            
            if (!current_scene.is_scenes_precached && current_scene.precache_scenes != null)
            {
                //console.log("coarse engine: current_scene: " + current_scene.title);
                //console.log("coarse engine: getting scenes array");
                cache_scene_idx = !cache_scene_idx & 1; //update to the new scene cache array.
                _AM.scenes[cache_scene_idx] = {}; //hopefully this releases what was already cached/stored. make sure this doesnt kill what is currently playing...

                for (i = 0; i < current_scene.precache_scenes.length; i++)
                {
                    //*** TO DO: change this to get the functino from the server.
                    //this guid needs to be replaced with the current session guid.
                    //console.log("coarse engine: request scene" + current_scene.precache_scenes[i]);
                    /*
                    (function (scene_i, idx){
                        $.get(_ajax_url_precache + "/" + c1 + "/" + _AM.session_id + "/" + current_scene.precache_scenes[idx], function (data) {
                            if (data != "false") {
                                _AM.scenes[scene_i][current_scene.precache_scenes[idx]] = (new Function(data))(); //window[current_scene.precache_scenes[i]]();
                            } else {
                                //signin(); //should be defined in index.html
                                _AMI.show_sign_in();
                            }
                        });
                    })(cache_scene_idx, i);
                    */

                    (function (scene_i, idx){
                        $.get(_ajax_url_read_scene_mongo + "/" + c1 + "/" + current_scene.precache_scenes[idx], function (data) {
                            if (data != "false") {
                                _AM.scenes[scene_i][current_scene.precache_scenes[idx]] = data; //window[current_scene.precache_scenes[i]]();
                                _AM.scene_wireup(data);
                            } else {
                                //signin(); //should be defined in index.html
                                _AMI.show_sign_in();
                            }
                        });
                    })(cache_scene_idx, i);


                    //var codeToExecute = "My.Namespace.functionName()";
                    //var tmpFunc = new Function(codeToExecute);
                    //tmpFunc();
                    //_AM.scenes[cache_scene_idx][current_scene.precache_scenes[i]] = window[current_scene.precache_scenes[i]]();                    
                }
                current_scene.is_scenes_precached = true;
                //console.log("coarse engine: scenes precached");
            }

            //Section to make sure the 2nd video stream is cached and ready to go for loop back.
            if (vid_stream[ren] >= switch_video_stream_time_precache && current_scene.is_loop && !current_scene.is_loop_ready && scene_switching == 0) {
                //precache for looping back on self.            
                //console.log("coarse engine: loop back section");
                if (!current_scene.video_src2_is_precached) {
                    //debug_log('[scene_coarse_engine: precaching video source 2 for loop back');
                    current_scene.video_src2_is_precached = true;
                    //setTimeout(function () { precache_video(_AM.video_streams[!video_stream_idx & 1], current_scene.video_src2, current_scene.goto - _AM.scene_sync_video_time); }, 10);
                    //console.log("coarse engine: request precache");
                    requestAnimationFrame(function () { precache_video(_AM.video_streams[!video_stream_idx & 1], current_scene.video_src2, current_scene[ew] - _AM.scene_sync_video_time); });
                } else if (_AM.video_streams[!video_stream_idx & 1].can_play && _AM.video_streams[!video_stream_idx & 1][ren] != current_scene[ew] - _AM.scene_sync_video_time) {
                    //already precached then just seek the location                
                    //debug_log('[scene_coarse_engine: preseeking non-active video for loop back');
                    //_AM.setTimeout(function () { _AM.video_streams[!video_stream_idx & 1][ren] = current_scene.goto - _AM.scene_sync_video_time; }, 10);
                    //_AM.video_streams[!video_stream_idx & 1][ren] = current_scene.goto - _AM.scene_sync_video_time;
                    //console.log("coarse engine: loop is ready");
                    current_scene.is_loop_ready = true;
                }
            }
            //end section to make sure loop back is ready.

            if (vid_stream[ren] >= switch_video_stream_time && current_scene.video_src2_is_precached && _AM.video_streams[!video_stream_idx & 1].can_play && current_scene.is_loop && scene_switching == 0) {
                //it's time for the video to loop back, synchronize videos and switch to the other video source.
                //debug_log('[scene_coarse_engine: starting video sync for loop back');                
                //abort loop back if a default selection is specified.
                if (!current_scene.change_scene_called && current_scene.auto_change_scene_func != null) {
                    //console.log("coarse engine: default selection");
                    //auto scene change
                    //this doesnt set scene_switching, as we set change_scene_called.
                    current_scene.change_scene_called = true;              

                    /*for (s = 0; s < current_scene.sentences.length; s++) {
                        //var i = s;
                        $(current_scene.sentences[s].sent_div).fadeOut("fast", function () { $(this).remove(); });
                    }*/


                    //hide and remove all sentence images, other images removal responsible by timer or user.
                    //_AM.hide_images(false, null);

                    _AM.setTimeout(function () { current_scene.auto_change_scene_func(); }, 10);
                    //} else if (current_scene.next_scene != null && !current_scene.is_loop) {
                } else {
                    scene_switching = 3;
                    //_AM.setTimeout(function () { sync_video_to_video(_AM.video_streams[video_stream_idx], switch_video_stream_time, _AM.video_streams[!video_stream_idx & 1], current_scene.goto - _AM.scene_sync_video_time, _AM.scene_sync_video_time*1000, scene_synced_loop); }, 10);
                    //console.log("coarse engine: sync video request - loopback");
                    syncing_video = true;
                    
                    requestAnimationFrame(function () { sync_video_to_video(_AM.video_streams[video_stream_idx], switch_video_stream_time, _AM.video_streams[!video_stream_idx & 1], current_scene[ew] - _AM.scene_sync_video_time, _AM.scene_sync_video_time * 1000, scene_synced_loop); });
                }
                /*} else if (vid_stream[ren] >= current_scene.next_scene_time_precache && scene_switching == 0) {
                //MOVED TO CHANGE_SCENE FUNCTION.
                if (current_scene.next_scene != null && current_scene.change_scene_called) {
                    //scene change has been called, detected because is_loop has been turned off.
                    //it's time to pre-cache the video for the next scene, no more loop back etc permitted in change state.
                    scene_switching = 1;

                    //!video_stream_idx converts it to a bool... so i then do & 1 to convert it back to a number
                    //debug_log('[coarse_engine]: precache called @pos ' + vid_stream[ren]);
                    //setTimeout(function () { precache_video(_AM.video_streams[!video_stream_idx & 1], current_scene.next_scene.video_src1, current_scene.wd - _AM.scene_sync_video_time); }, 10);
                    requestAnimationFrame(function () { precache_video(_AM.video_streams[!video_stream_idx & 1], current_scene.next_scene.video_src1, current_scene[wd] - _AM.scene_sync_video_time) });
                }*/

            } else if (vid_stream[ren] >= current_scene.next_scene_time && _AM.video_streams[!video_stream_idx & 1].can_play && current_scene.next_scene != null && scene_switching == 1) {
                //it's time for the video to progress to the next scene, synchronize videos and switch to other video source.
                //console.log("coarse engine: sync video request - scene change");
                scene_switching = 2;
                //debug_log('[coarse_engine]: @pos ' + vid_stream[ren] + 'requesting ' + current_scene.next_scene_time);
                //setTimeout(function () { sync_video_to_video(_AM.video_streams[video_stream_idx], current_scene.next_scene_time, _AM.video_streams[!video_stream_idx & 1], current_scene.wd - _AM.scene_sync_video_time, _AM.scene_sync_video_time*1000, scene_synced_new_scene); }, 10);
                syncing_video = true;
                requestAnimationFrame(function () { sync_video_to_video(_AM.video_streams[video_stream_idx], current_scene.next_scene_time, _AM.video_streams[!video_stream_idx & 1], current_scene[wd] - _AM.scene_sync_video_time, _AM.scene_sync_video_time * 1000, scene_synced_new_scene); });
            }

            //only check for displaying sentences, images if a scene change has not already been called.        
            /*if (!current_scene.change_scene_called) {
                //check sentences.
                for (i = 0; i < current_scene.sentences.length; i++) {
                    test_sent = current_scene.sentences[i];
                    if (test_sent) {
                        if (!test_sent.triggered && vid_stream[ren] >= test_sent[ou] && (test_sent[uo] == 0 || vid_stream[ren] < test_sent[uo])) {
                            _AM.display_sentence_group(test_sent.sentence_group, "slow");
                        } else if (test_sent.triggered && vid_stream[ren] >= test_sent[uo] && test_sent[uo] != 0) {
                            test_sent.triggered = false;
                            $(current_scene.sentences[i]).trigger("on_hide", { typ: "sentence", sentence: current_scene.sentences[i] });
                            $(test_sent.sent_div).fadeOut("fast", function () { $(this).remove(); });
                        }
                    }
                }
            }*/
            
            //for (i = 0; i < current_scene.images.length; i++) {
            var test_image;
            for (var key in _AM.images) {
                if (_AM.images.hasOwnProperty(key)) {
                    test_image = _AM.images[key];
                    if (test_image.scene_title == current_scene.title) { //only controls timing on images added in the current scene.
                        if (vid_stream[ren] >= test_image[ou] && vid_stream[ren] < test_image[uo]) {
                            if (!test_image.triggered && !test_image.perm_hide) {
                                //add image.
                                _AM.display_image_group(test_image.image_group, "fast");
                            }
                            //if an add was missed because of requirements and is later available for add because of requirements met, different function must be called by event.
                            //too intensive to check here.
                        } else if (test_image.triggered && vid_stream[ren] >= test_image[uo]) {
                            //remove image.
                            //only raise the on_hide event if it is displayed.
                            if (test_image.is_displayed) {
                                $(test_image).trigger("on_hide", { typ: "scene_image", scene_image: test_image });
                                //$(test_image.image_div).fadeOut("fast", function () { $(this).stop(); $(this).remove(); });                        
                                test_image.image_svg_group.setAttributeNS(null, 'class', test_image.animate_shape_class + '_hide');
                            }
                            test_image.triggered = false;
                            test_image.is_displayed = false;
                            remove_image(test_image, null);
                            //setTimeout(function () { $(test_image.image_svg_group).remove(); }, scene_fade_text_time_remove_delay);                            
                        }
                    }
                }
            }

            var test_iframe;
            for (i = 0; i < current_scene.iframes.length; i++) {
                test_iframe = current_scene.iframes[i];
                if (test_iframe) {
                    if (!test_iframe.triggered && vid_stream[ren] >= test_iframe[ou] && vid_stream[ren] < test_iframe[uo]) {
                        //add iframe.
                        _AM.display_iframe(test_iframe, "fast");
                    }/* else if (test_iframe.triggered && vid_stream[ren] >= test_iframe[uo]) {
                        //remove iframe. -- iframe is responsible for messaging up to be closed.
                    }*/
                }
            }
        }
    }

    _AM.display_iframe = function display_iframe(iframe, speed)
    {                
        iframe.triggered = true;
        /*if (!iframe.is_precached) {
            iframe.precache();
        }*/       

        video_offset = $(_AM.video_streams[video_stream_idx]).offset();
        iframe.html_iframe.setAttribute('style', 'left:' + video_offset.left + 'px; top:' + video_offset.top + 'px;');
        $(iframe).trigger("on_show", { typ: "iframe", iframe: current_scene.iframe });
        $(iframe.html_iframe).fadeIn(speed, function () { _AM.pause_scene(); this.setAttribute("class", "story_iframe_show"); });
    }

    //the removal should be handled in sentence_select
    _AM.display_sentence_group = function display_sentence_group(sentence_group, speed)
    {

        var first_time = 1;
        var focus_sentence;
        var focus_sentence_idx;

        var all_complete = true;
        var s;
        for (s = 0; s < current_scene.sentences.length; s++) {

            if (current_scene.sentences[s].sentence_group == sentence_group)
            {
                if(!current_scene.sentences[s].needed || _AM.check_bag(current_scene.sentences[s].needed)) {
                    if (first_time && current_scene.sentences[s].revealed_idx < current_scene.sentences[s].words.length - 1) {
                        first_time = 0;
                        focus_sentence = current_scene.sentences[s];
                        focus_sentence_idx = s;

                        //update current sentence.
                        current_scene.current_sentence = current_scene.sentences[s];
                        current_scene.sentence_idx = s;

                        all_complete = false;
                    }

                    current_scene.sentences[s].words_html = build_words_html(current_scene.sentences[s].words, current_scene.sentences[s].sentence_id, current_scene.sentences[s].is_scramble, current_scene.sentences[s].revealed_idx);

                    //wire up events on the sentences:
                    //if it's scramble mode when the last word for the sentence is selected is responsible for wiring this up.
                    //*** Adding if statement to only wire select up if it is a choice sentence 04-18-14
                    if (current_scene.sentences[s].can_select || current_scene.sentences[s].next_sentence_group) {
                        if ((!_AM.scramble_mode || current_scene.sentences[s].revealed_idx >= current_scene.sentences[s].words.length) && !current_scene.sentences[s].is_scramble) {
                            //add event to select senetence.
                            $(current_scene.sentences[s].words_html[current_scene.sentences[s].words_html.length - 1]).on("click", { ss: s }, function (event) { event.stopPropagation(); var sent = current_scene.sentences[event.data.ss]; sentence_focus(sent.sent_div); var self = this; sentence_selected(self);  });
                            //$(current_scene.sentences[s].words_html[current_scene.sentences[s].words_html.length - 1]).on("touchend", { ss: s, }, function (event) { event.stopPropagation(); var sent = current_scene.sentences[event.data.ss]; sentence_focus(sent.sent_div); self = this; sentence_selected(self); if ($.isFunction(sent.word_functions[sent.word_functions.length - 1])) { sent.word_functions[sent.word_functions.length - 1](); } });
                        }
                        if (!current_scene.sentences[s].is_scramble) {
                            //speaker
                            $(current_scene.sentences[s].words_html[current_scene.sentences[s].words_html.length - 2]).on("click", { ss: s }, function (event) { event.stopPropagation(); var sent = current_scene.sentences[event.data.ss]; sentence_focus(sent.sent_div); sent.play(0, sent.words.length - 1); });
                            //$(current_scene.sentences[s].words_html[current_scene.sentences[s].words_html.length - 2]).on("touchend", { ss: s }, function (event) { event.stopPropagation(); var sent = current_scene.sentences[event.data.ss]; sentence_focus(sent.sent_div); sent.play(0, sent.words.length - 1); });
                        }
                    } else {
                        if (!current_scene.sentences[s].is_scramble) {
                            //speaker
                            $(current_scene.sentences[s].words_html[current_scene.sentences[s].words_html.length - 1]).on("click", { ss: s }, function (event) { event.stopPropagation(); var sent = current_scene.sentences[event.data.ss]; sentence_focus(sent.sent_div); sent.play(0, sent.words.length - 1); });
                            //$(current_scene.sentences[s].words_html[current_scene.sentences[s].words_html.length - 2]).on("touchend", { ss: s }, function (event) { event.stopPropagation(); var sent = current_scene.sentences[event.data.ss]; sentence_focus(sent.sent_div); sent.play(0, sent.words.length - 1); });
                        }
                    }
                    //end wire up events on the sentences.

                    //current_scene.sentences[s].is_displayed = true;
                    
                    current_scene.sentences[s].triggered = true;
                    current_scene.sentences[s].is_displayed = true;
                    add_words_to_display(current_scene.sentences[s], all_complete);

                    //document.dispatchEvent(new CustomEvent("on_show", { bubbles: false, cancelable: false, detail: { typ: "sentence", obj: current_scene.sentences[s] } }));                    
                    $(current_scene.sentences[s]).trigger("on_show", { typ: "sentence", sentence: current_scene.sentences[s] });

                    if (s == focus_sentence_idx) {
                        _AM.save_data.karma += current_scene.sentences[s].karma;

                        //include a call back function to change classes to none fade in type at the end. this fixes the issue with resizing window putting the sentence hidden again.
                        $(current_scene.sentences[s].sent_div).fadeIn(speed, function () {                        
                            for (s = 0; s < current_scene.sentences.length; s++) {
                                if (current_scene.sentences[s].sentence_group == sentence_group)
                                {
                                    if (s == focus_sentence_idx) 
                                    {
                                        $(focus_sentence.sent_div).attr('class', 'story_div_sentence_focus');

                                    
                                        //if (_AM.scramble_mode && !current_scene.sentences[s].is_scramble) {
                                        if (_AM.scramble_mode) { //renive is_scramble check because scramble should never be focus_sentence_idx.
                                            //underline word to read.    
                                            if (current_scene.sentences[s].revealed_idx < current_scene.sentences[s].words.length && current_scene.sentences[s].is_complete == false) {
                                                $('#div_inner_word_' + s + '_' + current_scene.sentences[s].revealed_idx).attr('class', 'story_div_inner_word_focus_hidden');
                                            }                                    
                                        }

                                    }else{
                                        $(current_scene.sentences[s].sent_div).attr('class', 'story_div_sentence_nofocus');
                                    }
                                }                            
                            }

                            //wire up self remove of sentence at stop time, if not in make me read mode.
                            /*if (!_AM.scramble_mode && current_scene.sentences[focus_sentence_idx].end_time > 0) {
                                var me = this;
                                _AM.setTimeout(function () { $(me).fadeOut("fast", function () { $(this).remove(); }); }, current_scene.sentences[focus_sentence_idx].end_time - current_scene.sentences[focus_sentence_idx].start_time * 1000);
                            }*/
                        });
                    } else {                        
                        $(current_scene.sentences[s].sent_div).fadeIn(speed);                        
                    }

                    $(current_scene.sentences[s].sent_div).find('#story_div_sentence_button_img_select_' + s).attr('src', _AM.image_path + 'sentence_icon_off.svg');
                } else {
                    //sentence does not meet requirements, but flag as triggered for coarse engine.
                    current_scene.sentences[s].triggered = true;
                }
            }
        }      
    }

    _AM.image_flash = function image_flash(item)
    {
        //$(item).fadeTo("fast", 1.0, function () { var me = this; _AM.setTimeout(function () { $(me).fadeTo("fast", 0.2, function () { var me = this; _AM.setTimeout(function () { image_flash(me); }, 800); });  }, 800); });
        $(item).fadeTo("fast", 1.0, function () { if (!_AM.scene_paused) { var me = this; _AM.setTimeout(function () { $(me).fadeTo("fast", 0.2, function () { var me = this; _AM.image_flash(me); }); }, 1000); } });
        //$(item).fadeTo("fast", 1.0, function () { var me = this; $(me).fadeTo("fast", 0.2, function () { var me = this; image_flash(me);})});
    }

    //used to reupdate display_image_group for if needed has changed.
    _AM.display_missing_image_group = function display_missing_image_group()//titlex)
    {
        //if (image_group_name in current_scene.displayed) {
        var test_image;
        for (var key in _AM.images) {
            if (_AM.images.hasOwnProperty(key)) {
                test_image = _AM.images[key];
                if (test_image.scene_title == current_scene.title) {
                    //test_image.image_group == group_name, removed group check, but i need to check what groups are currently visible....
                    if (current_scene.displayed && test_image.image_group in current_scene.displayed) {
                        if (test_image.triggered && !test_image.is_displayed && (!test_image.needed || _AM.check_bag(test_image.needed))) {

                            if (!_AM.scramble_mode && test_image.sent_is_scramble) {
                                test_image.sent_is_complete = true;
                            }

                            if (!test_image.sent_is_scramble || (test_image.sent_is_scramble && !test_image.sent_is_complete)) {
                                //if ((!_AM.scramble_mode && !test_image.sent_is_scramble) || _AM.scramble_mode) {
                                //***TODO: Test
                                //late add image.
                                add_image_to_display(test_image);
                                test_image.triggered = true;
                                test_image.is_displayed = true;

                                image_scramble_display_toggle(test_image.image_group);


                                $(test_image).trigger("on_show", { typ: "scene_image", scene_image: test_image });

                                if (test_image.flash) {
                                    _AM.image_flash(test_image.image_svg_group);
                                }

                                //set it to animate.
                                if (test_image.animate_shape.length > 1) {
                                    animate_image(test_image);
                                }
                                //}
                            } else {
                                test_image.triggered = true;
                            }
                        }
                    } else if (test_image.sent_is_scramble) {
                        update_image_scramble_complete(test_image.image_group);
                    }
                }
            }
        }
        //}
    }    

    //the removal should be handled in sentence_select
    //*** TO DO: review the first_time section and focus image, as its not using current_scene.current_image and current_scene.current_titlex.
    _AM.display_image_group = function display_image_group(image_group, speed) {
        var first_time = 1;                

        //for (var i = 0; i < current_scene.images.length; i++) {
        var test_image;
        for (var key in _AM.images) {
            if (_AM.images.hasOwnProperty(key)) {
                test_image = _AM.images[key];

                if (test_image.scene_title == current_scene.title && test_image.image_group == image_group) {

                    if (!current_scene.displayed) {
                        current_scene.displayed = {};
                    }

                    if (!(image_group in current_scene.displayed)) {
                        //track what image groups are currently displayed.
                        current_scene.displayed[image_group] = true;
                    }

                    if (!_AM.scramble_mode && test_image.sent_is_scramble) {
                        test_image.sent_is_complete = true;
                    }

                    if (!test_image.needed || _AM.check_bag(test_image.needed) && !test_image.is_displayed) {
                        //if ((!_AM.scramble_mode && !test_image.sent_is_scramble) || _AM.scramble_mode) {
                            //rc 2014-10-19 - dont reshow scramble if its done.               
                        //if (!(test_image.sent_is_scramble && test_image.sent_is_complete)) {   //rc 2014-10-19
                        if (!test_image.sent_is_scramble || (test_image.sent_is_scramble && !test_image.sent_is_complete)) {
                            add_image_to_display(test_image);
                            test_image.triggered = true;
                            test_image.is_displayed = true;

                            //manually checks to see if sent is complete or not, as this is not set in the scene_image constructor.
                            if (!test_image.sent_is_scramble && test_image.sent_revealed_idx >= test_image.word_count) {
                                test_image.sent_is_complete = true;
                            }

                            //--test_image.svg_path.setAttribute('style', 'left:' + (video_offset.left + (test_image.x * video_intrinsic_scale)) + 'px; top:' + (video_offset.top + (test_image.y * video_intrinsic_scale)) + 'px; width:' + (test_image.width * video_intrinsic_scale).toFixed(0) + 'px; height:' + (test_image.height * video_intrinsic_scale).toFixed(0) + "px;");

                            //raise on_show event on the image object.
                            //document.dispatchEvent(new CustomEvent("on_show", { bubbles: false, cancelable: false, detail: { typ: "image", obj: test_image } }));
                            $(test_image).trigger("on_show", { typ: "scene_image", scene_image: test_image });

                            if (first_time && test_image.sent && !test_image.sent_is_scramble && !test_image.sent_is_complete && test_image.sent_can_select) {
                                first_time = 0;
                                image_focus(test_image.title);
                            }


                            //$(test_image.image_div).attr('class', 'story_div_image_transition');
                            if (test_image.flash) {
                                //add fadein code and call back function to fadeout to 50% and callback function to fade in... etc.
                                //"slow" could be the time in milliseconds instead with out the "".
                                _AM.image_flash(test_image.image_svg_group);
                            } else {
                                //$(test_image.image_svg_group).fadeIn("slow");//, function () {
                            }


                            //set it to animate.
                            if (test_image.animate_shape.length > 1) {
                                animate_image(test_image);
                            }
                        } else {
                            test_image.triggered = true;
                        }
                    } else {
                        //flag triggered for coarse engine but do not display.
                        test_image.triggered = true;
                    }
                }
            }
        }
    }

    function abort_precache_abort_sync() {
        syncing_video = false;
        splicing_audio = false;
        scene_switching = 4;

        $(_AM.video_streams[video_stream_idx]).off();
        $(_AM.video_streams[!video_stream_idx & 1]).off();
        $(_AM.video_streams[video_stream_idx]).on("canplay", ready_to_play);
        $(_AM.video_streams[!video_stream_idx & 1]).on("canplay", ready_to_play);
    }

    _AM.change_scene = function change_scene(to_scene_name, from, goto)
    {
        clearInterval(scene_coarse_engine_handle);
        clearInterval(scene_fine_engine_handle);
        scene_fine_engine_handle = null;
        scene_switching = 4;
        syncing_video = false;
        requestAnimationFrame(function () {
            abort_precache_abort_sync();
            var to_scene = _AM.scenes[cache_scene_idx][to_scene_name];
            current_scene.change_scene_called = true;
            current_scene.next_scene = to_scene;

            if (from) {
                current_scene.next_scene_time_precache = from - (_AM.scene_cache_video_time + _AM.scene_sync_video_time);
                current_scene.next_scene_time = from - (_AM.scene_sync_video_time);
                current_scene[uo] = from;
            }

            if (goto) {
                current_scene[wd] = goto;
            } else {
                current_scene[wd] = to_scene[ou];
            }

            current_scene.is_loop = false;

            //to_scene.precache();
            
            //!video_stream_idx converts it to a bool... so i then do & 1 to convert it back to a number
            //debug_log('[coarse_engine]: precache called @pos ' + vid_stream[ren]);
            _AM.video_streams[video_stream_idx][bz] = _AM.video_stream_volume;
            scene_switching = 0;
            //console.log("change scene: precache video called.");
            precache_video(_AM.video_streams[!video_stream_idx & 1], current_scene.next_scene.video_src1, current_scene[wd] - _AM.scene_sync_video_time);
            scene_switching = 1;
            scene_coarse_engine_handle = _AM.setInterval(scene_coarse_engine, 250);
            //scene_switching = 1;
            //precache_video(_AM.video_streams[!video_stream_idx & 1], to_scene.video_src1, goto);
        });
        //save the current path using auto save, incase we need to recover from a crash.
        //_AM.update_save_data(to_scene_name);
        //_AM.auto_save();
    }

    _AM.cut_scene = function cut_scene(to_scene_name, goto) {
        //console.log("cut_scene called");
        clearInterval(scene_coarse_engine_handle);
        clearInterval(scene_fine_engine_handle);
        scene_fine_engine_handle = null;
        scene_switching = 4;
        syncing_video = false;
        requestAnimationFrame(function () {
            //console.log("cut_scene in animation frame.");
            abort_precache_abort_sync();            
            var to_scene = _AM.scenes[cache_scene_idx][to_scene_name];
            //shut down the current engine.    
            current_scene.change_scene_called = true;
            current_scene.next_scene = to_scene;
            current_scene.is_loop = false;

            if (goto != null) {
                current_scene[wd] = goto;
            } else {
                current_scene[wd] = to_scene[ou];
            }

            _AM.clearTimers();            

            //to_scene.precache();

            //after set_active_video
            //call the play event when the player can play.
            $(_AM.video_streams[!video_stream_idx & 1]).on("canplay", function (event) {
                //_AM.resize();
                //clearInterval(scene_fine_engine_handle);
                //reset_scene_switching();            
                this[bz] = 0.0;
                //console.log("cut_scene can play");
                _AM.video_streams[!video_stream_idx & 1][ren] = current_scene[wd];
                if (current_scene[wd] != 0) {
                    $(_AM.video_streams[!video_stream_idx & 1]).on('seeked', function (event) {
                        this[alb]();
                        //console.log("cut_scene seeked");
                        $(_AM.video_streams[!video_stream_idx & 1]).on("timeupdate", function (event) {
                            if (_AM.video_streams[!video_stream_idx & 1][ren] > current_scene[wd]) {
                                //console.log("time update started.");
                                reset_scene_switching();
                                //console.log("cut scene: current_scene" + current_scene.name);
                                //console.log("cut scene: playing on :" + (!video_stream_idx & 1));               

                                //if the cutscene is faded to or not is dependent on the setting in the cutscene scene settings fade scene setting.
                                set_active_video_stream(_AM.video_streams[video_stream_idx], _AM.video_streams[!video_stream_idx & 1], !video_stream_idx & 1, true, current_scene.next_scene.apply_scene_fade);
                                //video_stream_idx has now updated.
                                _AM.video_streams[!video_stream_idx & 1][bz] = 0.0;
                                _AM.video_streams[video_stream_idx][bz] = _AM.video_stream_volume;
                                //console.log("cut scene: pause called on :" + (!video_stream_idx & 1));
                                _AM.video_streams[!video_stream_idx & 1][yiu]();
                                
                                //console.log("cut scene: coarse engine restarted.");
                                //scene_switching = 0;
                                scene_coarse_engine_handle = _AM.setInterval(scene_coarse_engine, 250);
                                $(this).off(event);
                            }
                        });
                        $(this).off(event);
                    });
                } else {
                    this[alb]();
                    $(_AM.video_streams[!video_stream_idx & 1]).on("timeupdate", function (event) {
                        if (_AM.video_streams[!video_stream_idx & 1][ren] > 0) {
                            //console.log("did not expect to be here...");
                            reset_scene_switching();
                            
                            set_active_video_stream(_AM.video_streams[video_stream_idx], _AM.video_streams[!video_stream_idx & 1], !video_stream_idx & 1, true, 0);
                            //video_stream_idx has now updated.
                            _AM.video_streams[!video_stream_idx & 1][bz] = 0.0;
                            _AM.video_streams[video_stream_idx][bz] = _AM.video_stream_volume;
                            _AM.video_streams[!video_stream_idx & 1][yiu]();
                            
                            //scene_switching = 0;
                            scene_coarse_engine_handle = _AM.setInterval(scene_coarse_engine, 250);
                            $(this).off(event);
                        }
                    });
                }

                $(this).off(event);
            });

            scene_switching = 0;
            //console.log("cut scene: precache video called.");
            precache_video(_AM.video_streams[!video_stream_idx & 1], to_scene.video_src1, goto);
            scene_switching = 4;
        });
    }

    _AM.stop = function stop_scenes() {
        _AM.play_pause_all();

        _AM.playing = 0;        
        scene_switching = 0;
        is_audio_playing = 0;

        video_stream_idx = 0;
        
        audio_streams_cache_invalidated = true;
        //scene_switching = 0;
      
        
        if (current_scene)
        {
            if (current_scene.current_sentence) {
                current_scene.current_sentence.is_displayed = false;
            }          

            current_scene.video_src1_is_precached = true;
            current_scene.video_src2_is_precached = false;

            current_scene.is_loop_ready = false;
        }        
        

        if (_AM.video_streams[0] !== undefined)
        {
            _AM.video_streams[0][bz] = 0.0;
            _AM.video_streams[0].can_play = false;
            $(_AM.video_streams[0]).attr("class", "story_video_player_show");
        }
        
        if (_AM.video_streams[1] !== undefined) {
            _AM.video_streams[1][bz] = 0.0;
            _AM.video_streams[1].can_play = false;
            $(_AM.video_streams[1]).attr("class", "story_video_player_hide");
        }
    }

    function play_scenes_helper(scene, scene_title) {
        _AM.playing = 1;
        current_scene = scene;
        video_stream_idx = 0;

        //set volumes before starting.
        _AM.set_audio_levels(_AM.audio_stream_volume, _AM.video_stream_volume);

        //if this is the first scene in the save data add it to save data.

        //if (_AM.save_data.scene_path.length == 0) {
            //_AM.save_data.scene_path[0] = scene_title;
            //_AM.save_data.chapter[0] = _AM.current_chapter;
        //    _AM.save_data.current_scene_name = scene_title;
        //    _AM.save_data.scene_path_idx = 0;

            /*if (store.get("save_slot")) {
                _AM.save(parseInt("save_slot_" + store.get("save_slot")));
            }*/
        //    _AM.auto_save();
        //}

        //call the play event and fade the volume in, when the player can play.
        $(_AM.video_streams[video_stream_idx]).on("canplay", function (event) {
            _AM.resize();

            _AM.video_streams[video_stream_idx][alb]();
            _AM.setTimeout(function () { splice_audio(null, null, _AM.video_streams[video_stream_idx], _AM.inc_vol_graph); }, 10);
            $(this).off(event);
        });

        precache_video(_AM.video_streams[video_stream_idx], current_scene.video_src1, current_scene[ou]);

        set_active_video_stream(null, _AM.video_streams[video_stream_idx], 0, false, 0);
        scene_coarse_engine_handle = _AM.setInterval(scene_coarse_engine, 250);
        //document.dispatchEvent(new CustomEvent("on_show", { bubbles: false, cancelable: false, detail: { typ: "scene", obj: current_scene } }));
        $(current_scene).trigger("on_show", { typ: "scene", scene: current_scene });

        //current_scene.precache();
    }

    var __scene_ready = 0;
    function ready_check(scene, scene_title)
    {
        if (__scene_ready == 1) {
            /*$.get(_ajax_url_precache + "/" + c1 + "/" + _AM.session_id + "/" + scene_title, function (data) {
                var scene;
                if (data != "false") {
                    scene = (new Function(data))(); //window[current_scene.precache_scenes[i]](); 
                    __scene_ready++;
                    setTimeout(function () { ready_check(scene, scene_title) }, 500);

                } else {
                    //signin(); //should be defined in index.html                            
                    _AMI.show_sign_in();
                }
            });*/
            console.log(_ajax_url_read_scene_mongo + "/" + c1 + "/" + scene_title);
            $.get(_ajax_url_read_scene_mongo + "/" + c1 + "/" + scene_title, function (data) {
                var scene;
                if (data != "false") {
                    //scene = (new Function(data))(); //window[current_scene.precache_scenes[i]]();
                    scene = data; 
                    _AM.scene_wireup(data);

                    __scene_ready++;
                    setTimeout(function () { ready_check(scene, scene_title) }, 500);

                } else {
                    //signin(); //should be defined in index.html                            
                    _AMI.show_sign_in();
                }
            });
        } else if (__scene_ready == 2) {
            setTimeout(function () {
                _AM.update_save_data(scene_title);
                _AM.auto_save();
            }, 500);

            play_scenes_helper(scene, scene_title);
        }else {
            setTimeout(function () { ready_check(scene, scene_title) }, 500);
        }        
    }
    
    function iin(next_func) {
        //init the data. 
        if((typeof(bz) == 'undefined')){
            /*$.get(_ajax_url_precache + "/" + g1 + "/" + session_id + "/" + g3,
            function (data) {
                if (data == 'false') {
                //login session is invalid, revoke it.
                //signin(); //should be defined in index.html
                    _AMI.show_sign_in();
            } else {
                    (new Function(data))();                    
                    next_func();
            }
            }); */              

            /*$.get(_ajax_url_read_scene_mongo + "/" + g1 + "/" + g3,
            function (data) {
                if (data == 'false') {
                //login session is invalid, revoke it.
                //signin(); //should be defined in index.html
                    _AMI.show_sign_in();
            } else {*/
                    //this is just used to take advantage of the scene loading the images into the global index.
                    _AM.images_wireup(data.images);            
                    next_func();
            //}
            //});
             
        } else {
            next_func();
        }
    }

    _AM.play = function play_scenes(scene_title)
    {
        //starts the video _AM.playing in current_scene, if it's already playing ignore it.
        if (!_AM.playing)
        {
            /*_AM.scenes[cache_scene_idx]["scene_" + current_scene.precache_scenes[i]] = window["scene_" + current_scene.precache_scenes[i]]();*/
            
            if((scene_title) in _AM.scenes[cache_scene_idx])
            {
                var scene;
                scene = _AM.scenes[cache_scene_idx][scene_title];
                play_scenes_helper(scene, scene_title);
                //we are already cached.
            }else{
                //not cached need to get the scene.
                //need to change this so it gets it from the server.
                //scene = window[scene_title]();
                __scene_ready = 0;                    
                //init the data.                

                iin(function () { __scene_ready++; ready_check(scene, scene_title); });
                //setTimeout(function () { ready_check(scene, scene_title) }, 500);
            }

           
        }
    }

    //needs to be wired up to _AM.video_streams[0] for first start of play.
    //to overcome some browsers security crap.
    _AM.play_pause_all = function play_pause_all() {
        /*_AM.video_streams[0].play();
        _AM.video_streams[0].pause();               
        
        _AM.video_streams[1].play();
        _AM.video_streams[1].pause();*/        

        if (scene_coarse_engine_handle) {
            clearInterval(scene_coarse_engine_handle);
            scene_coarse_engine_handle = null;
        }

        for (i = 0; i < _AM.video_streams.length; i++) {
            _AM.video_streams[i][alb]();
            _AM.video_streams[i][yiu]();
            _AM.video_streams[i].can_play = false;
        }

        for (i = 0; i < audio_streams.length; i++) {
            audio_streams[i][alb]();
            audio_streams[i][yiu]();
        }

        for (i = 0; i < audio_effects.length; i++) {
            audio_effects[i][alb]();
            audio_effects[i][yiu]();
        }        
    }

    _AM.set_audio_levels = function set_audio_levels(audio_vol, video_vol)
    {
        
        _AM.video_streams[video_stream_idx][bz] = video_vol;

        for (i = 0; i < audio_streams.length; i++) {
            audio_streams[i][bz] = audio_vol;
        }
    }

    function set_active_video_stream(from_video_stream, to_video_stream, new_video_stream_idx, new_scene, fade_time)
    {
        //console.log("set active video stream called");
        //***TO DO: change the style class for which video is active.

        //change which video stream has the on update function.
        
        //clear the engine off of "timeupdate" on previous active video.
        /*if (from_video_stream) {
            $(from_video_stream).off("timeupdate", scene_coarse_engine);
        }*/      

        /*
        $(from_video_stream).attr("class", "debug_border_off");
        $(to_video_stream).attr("class", "debug_border_on");
        */
        
        //hand off timing to other video stream for animation purposes.
        /*var n = _AM.video_streams[video_stream_idx][ren];
        //var t = (n - start_time) / 1000;
        var t

        if (img.loop_animate == 0) {
            t = n - img[kl];
        } else {
            t = n - img[kl] % img.animate_duration;
        }*/

        //only need to adjust timing of images if they existed from a previous time, previous video.
        if (from_video_stream)
        {
            var from_time = from_video_stream[ren];
            var to_time = to_video_stream[ren];
            var new_time;
            var fit;

            for (var key in _AM.images) {
                if (_AM.images.hasOwnProperty(key)) {
                    test_image = _AM.images[key];

                    t = (from_time - test_image[kl]) % test_image.animate_duration;

                    new_time = to_time - t;
                    if (new_time > 0) {
                        fit = Math.floor(new_time / test_image.animate_duration) + 1;
                        //adjust start time so its negative, forces triggered.
                        new_time = new_time - (fit * test_image.animate_duration);
                    }

                    test_image[kl] = new_time;
                }
            }
        }
        //end hand off.


        if (new_scene) {            
            //remove_all(); //clean up, just incase... should already have the images and sentences removed though...
            _AM.hide_images(true, null, true); //remove all image sentences, keep other images - their removal is maintained by story creater - images can persist through scenes.
            //call the on_start function
            //*** TO DO - add raise on_start event.

            //create custom events            
            //document.dispatchEvent(new CustomEvent("on_show", { bubbles: false, cancelable: false, detail: { typ: "scene", obj: new_scene } }));
            $(current_scene).trigger("on_hide", { typ: "scene", scene: current_scene });
            current_scene = current_scene.next_scene;
            $(current_scene).trigger("on_show", { typ: "scene", scene: current_scene });
            audio_streams_cache_invalidated = true;
            //scene_switching = 0;            
            
            current_scene.video_src1_is_precached = true;
            current_scene.video_src2_is_precached = false;
                        
            from_video_stream.can_play = false;

            setTimeout(function () {
                _AM.update_save_data(current_scene.title);
                _AM.auto_save();
            }, 500);
        }

        //****change this to fade out then apply hide. 
        if (fade_time) {
            //$(from_video_stream).attr("class", "story_video_player_transition"); //forces the current one to be higher temporarily than the to video stream.
            $(from_video_stream).attr("class", "story_video_player_fade_hide");
            //set the new video to show, which will now be below the from video stream.
            $(to_video_stream).attr("class", "story_video_player_show");

            //rc 2014-11-4 removed the set to permenent hide.
            //setTimeout(function () { $(from_video_stream).attr("class", "story_video_player_hide"); }, fade_time);
            /*$(from_video_stream).fadeOut(fade_time, function () {
                //$(from_video_stream).css('display', ''); //clear the inline style jquery applied with the fade out.
                $(from_video_stream).attr("class", "story_video_player_hide");
            });*/
        } else {            
            //set the new video to show, which will now be below the from video stream.
            $(from_video_stream).attr("class", "story_video_player_hide"); //forces the current one to be higher temporarily than the to video stream.
            $(to_video_stream).attr("class", "story_video_player_show");            
        }

        current_scene.is_loop_ready = false;
        
        
        //_AM.video_streams[!new_video_stream_idx & 1].pause();
        //console.log("set_active_video - old video stream: " + video_stream_idx);
        //console.log("set_active_video - new video stream: " + new_video_stream_idx);
        video_stream_idx = new_video_stream_idx;

        //add timeupdate monitor to new video.
        //$(to_video_stream).on("timeupdate", scene_coarse_engine);    

        //start up responsibilty of function that called set_active_video_stream
        //scene_coarse_engine_handle = _AM.setInterval(scene_coarse_engine, 250);
    }

    function precache_video(video_player, video_file, to_pos) {
        if (scene_switching == 0) {
            //console.log("precache_video executing");
            if (to_pos && to_pos > 0) {
                $(video_player).on("canplay", function (event) {
                    if (!syncing_video) {
                        //do not touch the position if videos are synchronizing.
                        //console.log("precache_video: setting position.");
                        this[ren] = to_pos;
                    }
                    $(this).off(event);
                });
            }

            video_player.src = video_file;
            video_player.can_play = false; //custom property.
            video_player[bz] = 0.0;
            video_player.load();
        }
    }

    _AM.play_effect = function play_effect(audio_file) {
        audio_effect_idx = (audio_effect_idx++) % audio_stream_max;
        var aud_eff = audio_effects[audio_effect_idx];

        $(aud_eff).off();
        $(aud_eff).on("canplay", function (event) { aud_eff[alb](); $(aud_eff).off(); });
        precache_audio(aud_eff, _AM.audio_path + 'effects/' + audio_file);
                
        $(aud_eff).on("stalled", function (event) { $(aud_eff).off(); });
        $(aud_eff).on("error", function (event) { $(aud_eff).off(); });
                
    }

    function precache_audio(audio_player, audio_file) {
        audio_player.src = audio_file;
        audio_player.can_play = false; //custom property.
        audio_player[bz] = _AM.audio_stream_volume;
        audio_player.load();
    }

    _AM.hide_sentences = function hide_sentences(delay_time, speed) {
        var s;
        if (delay_time) {
            _AM.setTimeout(function () {
                if (current_scene) {
                    for (s = 0; s < current_scene.sentences.length; s++) {
                        //var i = s;
                        current_scene.sentences[s].is_displayed = false;
                        $(current_scene.sentences[s]).trigger("on_hide", { typ: "sentence", sentence: current_scene.sentences[s] });
                        $(current_scene.sentences[s].sent_div).fadeOut(speed, function () { $(this).remove(); });
                    }
                }
            }, delay_time);
        } else {

            if (current_scene) {
                for (s = 0; s < current_scene.sentences.length; s++) {
                    //var i = s;
                    current_scene.sentences[s].is_displayed = false;
                    $(current_scene.sentences[s]).trigger("on_hide", { typ: "sentence", sentence: current_scene.sentences[s] });
                    $(current_scene.sentences[s].sent_div).fadeOut(speed, function () { $(this).remove(); });
                }
            }

        }
    }       

    _AM.hide_image = function hide_image(image, delay_time, perm_hide)
    {
        if (delay_time) {
            _AM.setTimeout(function () {
                image.is_animating = false;
                image.is_displayed = false;
                image.perm_hide = perm_hide;
                $(image).trigger("on_hide", { typ: "scene_image", scene_image: image });
                if (image.image_svg_group) {
                    image.image_svg_group.setAttributeNS(null, 'class', image.animate_shape_class + '_hide');
                    remove_image(image, null);
                }
                if (perm_hide) {
                    _AM.remove_image(image.title);
                }
            }, delay_time);
        } else {
            image.is_animating = false;
            image.is_displayed = false;
            image.perm_hide = perm_hide;
            $(image).trigger("on_hide", { typ: "scene_image", scene_image: image });
            if (image.image_svg_group) {
                image.image_svg_group.setAttributeNS(null, 'class', image.animate_shape_class + '_hide');
                remove_image(image, null);
            }
            
            if (perm_hide) {
                _AM.remove_image(image.title);
            }
        }
    }

    _AM.hide_images = function hide_images(sent_only, delay_time, perm_hide) {
       
        var test_image;
        if (delay_time) {
            _AM.setTimeout(function () {
                if (current_scene) {                    
                    //for (s = 0; s < current_scene.images.length; s++) {
                    for (var key in _AM.images) {
                        if (_AM.images.hasOwnProperty(key)) {
                            test_image = _AM.images[key];
                            
                            if (test_image.scene_title == current_scene.title) {
                                if (!sent_only || test_image.sent) {                                    
                                    if (test_image.is_displayed) {
                                        $(test_image).trigger("on_hide", { typ: "scene_image", scene_image: test_image });
                                        if (test_image.image_svg_group) {
                                            test_image.image_svg_group.setAttributeNS(null, 'class', test_image.animate_shape_class + '_hide');
                                        }
                                    }
                                    remove_image(test_image, null);
                                    test_image.is_animating = false;
                                    test_image.is_displayed = false;
                                    test_image.perm_hide = perm_hide;

                                    if (perm_hide) {
                                        _AM.remove_image(key);
                                    }
                                }
                            }
                        }
                    }
                }
            }, delay_time);
        } else {
            if (current_scene) {
                for (var key in _AM.images) {
                    if (_AM.images.hasOwnProperty(key)) {
                        test_image = _AM.images[key];

                        if (test_image.scene_title == current_scene.title) {
                            if (!sent_only || test_image.sent) {
                                if (test_image.is_displayed) {
                                    $(test_image).trigger("on_hide", { typ: "scene_image", scene_image: test_image });
                                    if (test_image.image_svg_group) {
                                        test_image.image_svg_group.setAttributeNS(null, 'class', test_image.animate_shape_class + '_hide');                                        
                                    }
                                }
                                remove_image(test_image, null);
                                test_image.is_animating = false;
                                test_image.is_displayed = false;
                                test_image.perm_hide = perm_hide;

                                if (perm_hide) {
                                    _AM.remove_image(key);
                                }
                            }
                        }
                    }
                }
            }
        }
    }


    /************* Scene **************
                                                                                            no add to
                 start_time       goto                                                      screen after        loop until                 end_time
                      |            |                                                        |                        |                        |                end of video.
Video 1: |<--- u1 --->|<--- s1 --->|<- a1 -><-------------------- v1 ---------------------->|<--- c1 ---><--- s1 --->|<--- c2 ---><--- s2 --->|<- a2 ->|<--- u2 --->|
         |                                                                                                           |<- a1 ->                         |
  start of video                                                                                                                                 real_end_time
  
                 start_time       goto                                                      screen after        loop until                 end_time
                      |            |                                                        |                        |                        |                end of video.
Video 2: |<--- u1 --->|<--- s1 --->|<- a1 -><-------------------- v1 ---------------------->|<--- c1 ---><--- s1 --->|<--- c2 ---><--- s2 --->|<- a2 ->|<--- u2 --->|
         |                                                                                                           |<- a1 ->                         |
  start of video                                                                                                                                 real_end_time

    c1, c2 are the times to cache video.
    s1, s2 are the times to sync video. a1, a2 are the times to fade in and out the video audio.
    u1, u2 are unused regions of the video file, but if you want to sync to start_time from another scene then u1 must be atleast an s1 quantity.
   "no add to screen after" means no sentences or images should be added to the screen because video transition engine is in control. The region covered by a1 and v1 are areas where sentences and images can be added to the screen.
    no cut scenes or change scenes can exist between start_time and goto as it is after goto that the next scenes get cached.
    with the changes to images and images extending beyond scene boundaries, start_time through to end_time is probably fair game for adding images/sentences.
    */
    //name should be globally unique.
    _AM.Scene = function Scene(title, start_time, end_time, loop_until, loop_goto, video_src1, precache_scenes, auto_change_scene_func, apply_loop_fade, apply_scene_fade)
    {
        //check this was called as a constructor.
        if (!(this instanceof arguments.callee))
            throw new Error("Scene constructor called as a function");
        
        //this.scene_id = scene_id;
        this.title = title;
        this.next_scene = null;     //the scene that will be called at the end of this scene being played.
        this.video_src1 = _AM.video_path_1 + video_src1; //video source used for the scene, 1 video per scene.
        this.video_src1_is_precached = false;
        this.video_src2 = _AM.video_path_2 + video_src1;
        this.video_src2_is_precached = false;
        
        this.precache_scenes = precache_scenes; //an array of scene names.
        this.is_scenes_precached = false;

        this[ou] = start_time;
        this[uo] = end_time;

        this.next_scene_time_precache = this[uo] - (_AM.scene_cache_video_time + _AM.scene_sync_video_time);
        this.next_scene_time = this[uo] - (_AM.scene_sync_video_time);
        this[wd] = null;

        this.change_scene_called = false;

        //default goto and loop_until.
        if (!loop_goto) {
            loop_goto = start_time + _AM.scene_sync_video_time; //can not be less than the time required for video sync up.
        }

        if (!loop_until) {
            loop_until = this.next_scene_time_precache;
        }

        //check goto and loop_until are valid.
        if(loop_goto+_AM.scene_cache_video_time + _AM.scene_sync_video_time <= loop_until && loop_goto-_AM.scene_sync_video_time >= 0 && loop_goto >= start_time)
        {
            //goto is good.
            this[ew] = loop_goto;
        }else{
            //raise error, but try to use it anyway.
            alert('Scene "' + name + '" has invalid parameters');
            this[ew] = loop_goto;
        }
                
        if (loop_until <= this.next_scene_time_precache) {
            this[op] = loop_until;
        } else {
            //raise error, but try to use it anyway.
            alert('Scene "' + name + '" has invalid parameters');
            this[op] = loop_until;
        }

        this.is_loop = true;
        this.is_loop_ready = false;
        
        this.auto_change_scene_func = auto_change_scene_func; //can be null, function to change scene if it is to default from lack of making a choice.
        
        if (apply_scene_fade != null) {
            this.apply_scene_fade = apply_scene_fade;
        } else {
            this.apply_scene_fade = true; //scene_fade_video_time;
        }

        if (apply_loop_fade != null) {
            this.apply_loop_fade = apply_loop_fade
        } else {
            this.apply_loop_fade = true; //scene_fade_video_time; //default it.
        }

        this.sentences = [];       //used to store the sentence objects of the scene. 
        
        this.sentence_idx;     //currently focused sentence.
        this.current_sentence;

        //this.images = [];
        this.current_image;
        this.current_image_idx;

        this.iframes = [];
                
        //word functions array is always 1 longer than the number of words in the sentence, the last function is the sentence chosen function.
        //each word in the sentence 
        //needed takes form of field:value pair with : as the seperator each field:value pair is seperated by a space.
        this.add_sentence = function add_sentence(scene_sentence)
        {
            var tmp_idx;

            tmp_idx = this.sentences.length;
            scene_sentence.sentence_id = tmp_idx;
            this.sentences.push(scene_sentence);
            if (!scene_sentence.is_scramble) {
                //first sentence is not allowed to be a scramble sentence.
                this.current_sentence = this.sentences[0];
                this.sentence_idx = 0;
            }
        }       

        //maybe add a motion path at some point.
        this.add_iframe = function add_iframe(scene_iframe) {          
            var tmp_idx;

            tmp_idx = this.iframes.length;
            scene_iframe.iframe_id = tmp_idx;
            this.iframes.push(scene_iframe);
        }


        //precache things for the scene... video and sentence play back is cached else where.
        /*this.precache = function precache()
        {
            return true;
        }*/
    }

    /*_AM.add_scene = function add_scene(scene) {
        var tmp_idx;

        tmp_idx = this.scenes.length;
        scene.scene_id = tmp_idx;
        this.scenes.push(scene);        
    }*/

    /*function get_coords(coords)
    {
        //requires array to return this format: 100,10 40,198 190,78 10,78 160,198

        res = '';
        for (c = 0; c < coords.length; c++) {
            if (c != 0) {
                if (c % 2) {
                    res += ',';
                } else {
                    res += ' ';
                }
            }

            //res += (coords[c] * video_intrinsic_scale).toFixed(0);
            res += (coords[c]);
        }

        return res;
    }*/

    /*
    //if this is added back in it needs maintenece, no more comma support, only space.
    function convert_path_d_to_obj(d)
    {
        var mainsplit = d.split(' ');
        var subsplit
        var obj = {};
        obj.num = [];
        obj.com = [];
        
        for (var i = 0; i < mainsplit.length; i++) {
            if (isNaN(mainsplit[i].charAt(0))) {                
                subsplit = mainsplit[i].substring(1).split(',');

                if (subsplit.length) {
                    obj.num.push(subsplit[0]);
                    obj.com.push(" " + mainsplit[i].charAt(0)); //push command operation.
                    obj.num.push(subsplit[1]);
                    obj.com.push(",");

                } else {
                    //subsplit has no length, probably an ending z command, push it.

                    obj.com.push(" " + mainsplit[i].charAt(0));
                }
            } else {
                //no command to push.
                subsplit = mainsplit[i].substring(1).split(',');
                obj.num.push(subsplit[0]);
                obj.num.push(subsplit[1]);
                obj.com.push(" ");
                obj.com.push(",");
            }
        }
        return obj;
    }*/

    function convert_path_obj_to_d(obj, from_idx) {
        if (!from_idx) {
            from_idx = 0;
        }
        var res = "";
        var max = Math.max(obj.num.length, obj.com.length);
        for (var i = from_idx; i < max; i++) {
            if (obj.com[i] && obj.com[i] != "Z") {
                res += obj.com[i];
            }
            if (obj.com[i] && obj.com[i] == "Z") {
                res += " ";
            }
            if (obj.num[i] || obj.num[i] == 0) {
                res += obj.num[i];
            }
            if (obj.com[i] && obj.com[i] == "Z") {
                res += obj.com[i];
            }
        }

        /*if (obj.num.length != obj.com.length) {
            //assuming there are more commands than numbers.
            //add the last Z command.
            res += obj.com[obj.com.length - 1];
        }*/

        return res;
    }   

    /*function convert_path_obj_to_d(obj) {
        var res = "";
        for (var i = 0; i < obj.num.length; i++) {
            res += obj.com[i] + obj.num[i];
        }

        if (obj.num.length != obj.com.length) {
            //assuming there are more commands than numbers.
            //add the last Z command.
            res += obj.com[obj.com.length - 1];
        }
        return res;
    }*/

    //title is a globally unique id and scene_title should be globally unique    
    _AM.Scene_Image = function Scene_Image(title, scene_title, start_time, end_time, image_src, width, height, animate_shape, name_of_person, sentence, sent_display_lines, sentence_clip_box, animate_shape_class, flash, image_group, next_image_group, hide_image_groups, can_select, revealed_idx, is_scramble, karma, needed, loop_animate)
    {
        if (!(this instanceof arguments.callee))
            throw new Error("Image constructor called as a function");
        
        this.title = title; //overridden if added to the array via add_image
        this.scene_title = scene_title;
        this.loop_animate = loop_animate;

        this[ou] = start_time;
        this[kl] = null;
        this[uo] = end_time;
        //this.x = x; //position in video to display image map.
        //this.y = y; //position in video to display image map.
        this.width = width;   //width and height of the image, if its a sprite map, it is just the width and height of a single image in the map.
        this.height = height;
        //this.max_width = max_width;
        //this.max_height = max_height;
        this.image_src = image_src; //path to the sprite png file. - could be sprite animated. have to define the frame rate some where, probably much less than 25fps
        this.flash = flash; //if the image should pulsate in and out slightly to draw attention to it.      

        this.name_of_person = name_of_person;
        this.sent = sentence;
        this.sent_can_select = can_select;
        this.sent_revealed_idx = revealed_idx;
        this.sent_input_idx = 0;
        this.sent_input = [];

        //build sentence for speech type compare
        if (this.sent) {
            for (var l = 0; l < this.sent.disp.length; l++) {
                for (var i = 0; i < this.sent.disp[l].length; i++) {
                    this.sent_input.push(this.sent.disp[l][i]);                  
                }
            }
        } else {
            this.sent_input = [];
        }

        this.sent_is_scramble = is_scramble;

        //this.sent_display_lines = display_lines; //the number of lines the box will hold, used for scrolling.
        //this.sent_top_line = 0;
        this.sent_clip_box = sentence_clip_box;
        
        //these get calculated later.
        this.sent_height = 0;
        this.sent_text_tale_height = 0;
        //this.sent_top = 0;

        this.sent_display_lines = sent_display_lines;
        /*if (sentence_clip_box) {
            this.sent_display_lines = Math.floor((sentence_clip_box[3] - sentence_clip_box[1]) / (_AM.video_intrinsic_font_size + 2 * _AM.scene_text_ver_spacing));
        } else {
            this.sent_display_lines = 0;
        }*/

        this.image_group = image_group;
        this.next_image_group = next_image_group;
        this.hide_image_groups = hide_image_groups;
        
        //this.coords = coords.split(",");
        //this.func = func; //the javascript function that is called when the item is touched.
                          //probably a limited set to choose from, item go to bag function, or a fast change scene/cut scene.
        this.triggered = false;
        this.is_displayed = false;
        this.perm_hide = false;
        //this.image_div = null;
        //this.image_img = null;
        this.image_svg = null;
        this.image_svg_path = null;        

        this.animate_shape = animate_shape;              
        //now its triggered change the time so its always triggered, for start...
        if (this.animate_shape && this.animate_shape[this.animate_shape.length - 1]) {
            this.animate_duration = this.animate_shape[this.animate_shape.length - 1].time; // - this[ou];
        }

        this.animate_shape_class = animate_shape_class;
        this.is_animating = false;

        //***precache the image, should i be doing this here????
        //this.image = new Image();
        //this.image.src = _AM.image_path + this.image_src;

        this.needed = needed;
        this.karma = karma;       
    }

    //NOT TESTED - NOT USED.
    _AM.Scene_Image_Reset = function Scene_Image_Reset(this_image)
    {
        //restore sentence to original state.
        if (this_image.image) {
            this_image.image.src = "";
            this_image.image = null;
        }

        $(this_image.image_svg_group).remove();

        //$(this_image.image_div).stop();
        //$(this_image.image_div).remove(); //hopefully this does not throw an error if it doesnt exist.
        //this_image.image_div = null;
        //this_image.image_img = null;            
        this_image.image_svg = null;
        this_image.image_svg_path = null;

        this_image.animate_path = null;
        this_image.animate_shape = null;
        this_image.is_animating = false;
        this[kl] = null;

        this_image.triggered = false;
        this_image.is_displayed = false;

        this_image.sent_height = 0;
        this_image.sent_text_tale_height = 0;
        //this_image.sent_top = 0;
        
    }

    //NOT TESTED - NOT USED.
    _AM.Scene_Image_Precache = function Scene_Image_Precache(this_image)
    {
        if (this_image.image_src != null) {
            this_image.image = new Image();
            this_image.image.src = _AM.image_path + this_image.image_src;            
        }
    }    

    _AM.Scene_iframe = function Scene_iframe(iframe_id, start_time, end_time, src)
    {
        if (!(this instanceof arguments.callee))
            throw new Error("iFrame constructor called as a function");

        this.iframe_id = iframe_id; //overridden if added to the array via add_sentence

        this[ou] = start_time;
        this[uo] = end_time;

        this.is_precached = false;
        //this.src = src;
        var u = getProtocol();

        this.src = u.protocol + _AM.iframe_path + src + '?frame_id=story_iframe_' + iframe_id;

        this.triggered = false;

        this.html_iframe = null;

        this.precache = function precache() {
            this.html_iframe = document.createElement("iframe");
            this.html_iframe.setAttribute("id", "story_iframe_" + this.iframe_id);

            //add the path back to here.
            this.html_iframe.src = this.src;

            this.html_iframe.setAttribute("class", "story_iframe_hide");
            this.html_iframe.setAttribute("scrolling", "no");
            //this.html_iframe.setAttribute("data-dom", u.protocol + );

            _AM.html_container.appendChild(this.html_iframe);            

            this.is_precached = true;
        }

        this.reset = function reset() 
        {
            this.iframe.src = "";
            this.iframe = null;
            this.is_precached = false;
            this.triggered = false;
        }
    }

    _AM.Scene_Sentence = function Scene_Sentence(sentence_id, start_time, end_time, x, y, width, font_color1, font_color2, sentence, file_name_overrides, sentence_group, next_sentence_group, can_select, revealed_idx, is_scramble, karma, needed)
    {
        if (!(this instanceof arguments.callee))
            throw new Error("Sentence constructor called as a function");

        this.sentence_id = sentence_id; //overridden if added to the array via add_sentence

        this[ou] = start_time;
        this[uo] = end_time;
            
        this.x = x;
        this.y = y;
        this.width = width;

        this.karma = karma;

        this.sentence = sentence;        

        this.file_name_overrides = file_name_overrides;
        //this.word_functions = word_functions;
        this.can_select = can_select;

        this.sentence_group = sentence_group;
        this.next_sentence_group = next_sentence_group;
        
        this.is_scramble = is_scramble;
        this.word_idx = 0;
        this.words = this.sentence.split(' ');

        //this.wrap_shape = wrap_shape;
        //this.class_wrap_shape = class_wrap_shape;
        
        //now called when sentence is displayed.
        /*if (_AM.scramble_mode && !this.is_scramble) {
            this.revealed_idx = 0;
        } else {
            this.revealed_idx = this.words.length;
        }*/


        this.original_revealed_idx = revealed_idx;
        if (_AM.scramble_mode && !this.is_scramble) {
            this.revealed_idx = revealed_idx;
        } else {
            this.revealed_idx = this.words.length;
        }

        //this.words_html = build_words_html(this.words, sentence_id, is_scramble);
        this.sent_div = null;

        this.font_color1 = font_color1;
        this.font_color2 = font_color2;

        this.is_first_time = true;
        this.is_complete = false;        

        this.needed = needed;

        var me = this;

        this.triggered = false;
        this.is_displayed = false;
        //this.is_selected = true;

        this.get_filename = function get_filename(idx)
        {
            var filename = this.file_name_overrides[idx];

            if (!filename) {
                filename = this.words[idx] + '.mp3';
            } else {
                filename = filename + '.mp3';
            }

            return _AM.audio_path + filename;
        }

        this.reset = function reset()
        {
            //restore sentence to original state.
            $(this.sent_div).stop();
            $(this.sent_div).remove(); //hopefully this does not throw an error if it doesnt exist.
            this.sent_div = null;

            if (_AM.scramble_mode && !this.is_scramble) {
                this.revealed_idx = this.original_revealed_idx;
            } else {
                this.revealed_idx = this.words.length;
            }
            //this.revealed_idx = this.original_revealed_idx;

            this.word_idx = 0;
            this.is_first_time = true;
            this.is_complete = false;
            this.triggered = false;
            this.is_displayed = false;
        }

        
    }    

    function sentence_focus(self)
    {
        if (!is_audio_playing) {
            //debug_log("[sentence_focus]: focus called");
            if (_AM.scramble_mode) {
                //un-highlight the next word you are supposed to be reading.
                if (!current_scene.current_sentence.is_complete) {
                    $('#div_inner_word_' + current_scene.sentence_idx + '_' + current_scene.current_sentence.revealed_idx).attr('class', 'story_div_inner_word_notselected_hidden');
                }
            }

            //remove any existing focus sentences.
            $('.story_div_sentence_focus').attr('class', 'story_div_sentence_nofocus');

            //focus on the currently selected sentence.
            var sentence_idx = parseInt($(self).attr('data-sen-id'));            
            $('#story_div_sentence_' + sentence_idx).attr('class', 'story_div_sentence_focus');

            //check to see if sentence has changed, if it has invalidate the audio cache.
            //if(current_scene.current_sentence){
            if (current_scene.current_sentence && current_scene.current_sentence.sentence_id != sentence_idx) {
                audio_streams_cache_invalidated = true;
                //debug_log("[sentence_focus]: audio cache invalidated");
                //sentence changed, remove previously added karma
                //debug_log("[sentence_focus]: current karma = " + _AM.save_data.karma);
                _AM.save_data.karma -= current_scene.current_sentence.karma;
                //debug_log("[sentence_focus]: karma changed by " + current_scene.current_sentence.karma + " karma = " + _AM.save_data.karma);

                current_scene.current_sentence = current_scene.sentences[sentence_idx];
                current_scene.sentence_idx = sentence_idx;

                //add karma for selection.
                _AM.save_data.karma += current_scene.current_sentence.karma;
                //debug_log("[sentence_focus]: karma changed by " + current_scene.current_sentence.karma + " karma = " + _AM.save_data.karma);
            } /*else {
                //sentence did not change, do not need to update karma.
                current_scene.current_sentence = current_scene.sentences[sentence_idx];
                current_scene.sentence_idx = sentence_idx;                
            }*/                      

            if (_AM.scramble_mode) {
                //***TODO: this audio playing check needs to be verified as ok, this selected event occurs with sentence click, but also when the speaker is clicked.
                //if this event is raised before the speaker event this will mess up, verify that it always calls speaker event first then bubbles up, then its ok.
                //need to set next word focus, if this was triggered by speaker press we do not want to update this.
                //if (!is_audio_playing) {
                if (current_scene.current_sentence.revealed_idx < current_scene.current_sentence.words.length && current_scene.current_sentence.is_complete == false) {
                    $('#div_inner_word_' + sentence_idx + '_' + current_scene.current_sentence.revealed_idx).attr('class', 'story_div_inner_word_focus_hidden');
                }
                //}
            }
        }
    }

    function sentence_selected(self)
    {
        //mark the word selected:
        //find the img button.        
        var sentence_idx = parseInt(self.getAttribute('data-sen-id'));
        $('#story_div_sentence_button_img_select_' + sentence_idx).attr('src', _AM.image_path + 'sentence_icon_on.svg');

        $(current_scene.sentences[sentence_idx]).trigger("on_selected", { typ: "sentence", sentence: current_scene.sentences[sentence_idx] });

        if(current_scene.sentences[sentence_idx].next_sentence_group)
        {
            //this was not a scene change but sentence displayed change, remove old sentences add new, and do it quickly
            //setTimeout(function () {
                var first_time = 1;
                if (current_scene) {
                    for (var s = 0; s < current_scene.sentences.length; s++) {
                        //var i = s;
                        if(current_scene.sentences[s].sentence_group == current_scene.current_sentence.sentence_group)
                        {
                            current_scene.sentences[s].is_displayed = false;
                            $(current_scene.sentences[s]).trigger("on_hide", { typ: "sentence", sentence: current_scene.sentences[s] });
                            if (first_time == 1) {                              
                                first_time = 0;
                                $(current_scene.sentences[s].sent_div).fadeOut("fast", function () { $(this).remove(); _AM.display_sentence_group(current_scene.sentences[sentence_idx].next_sentence_group, "fast");});
                            }else{
                                $(current_scene.sentences[s].sent_div).fadeOut("fast", function () { $(this).remove(); });
                            }
                        }
                    }
                }
            //}, 10);

        }//else{
            //THIS IS NOW HANDLED BY CALLING 2telltales.hide_sentences();

        
            //add code to schedule the removal of html_words.
            /*_AM.setTimeout(function () {
                if (current_scene) {
                    for (s = 0; s < current_scene.sentences.length; s++) {
                        //var i = s;
                        current_scene.sentences[s].is_displayed = false;
                        $(current_scene.sentences[s]).trigger("on_hide", { typ: "sentence", sentence: current_scene.sentences[s] });
                        $(current_scene.sentences[s].sent_div).fadeOut("slow", function () { $(this).remove(); });
                    }
                }
            }, 2000);*/
        //}

    }

    function remove_all()
    {
        for (var s = 0; s < current_scene.sentences.length; s++) {
            
            
                current_scene.sentences[s].is_displayed = false;
                $(current_scene.sentences[s].sent_div).stop(); 
                $(current_scene.sentences[s].sent_div).remove();
            
        }

        var test_image;
        //for (i = 0; i < current_scene.images.length; i++) {
        for (var key in _AM.images) {
            if (_AM.images.hasOwnProperty(key)) {
                test_image = _AM.images[key];
                
                test_image.is_displayed = false;
                $(test_image.image_svg_group).remove();
            }
        }
    }

    function get_word(image_idx, word_coord)
    {
        if (_AM.images[image_idx].sent.comp[word_coord.line][word_coord.word_idx] && _AM.images[image_idx].sent.comp[word_coord.line][word_coord.word_idx] != '') {
            return _AM.images[image_idx].sent.comp[word_coord.line][word_coord.word_idx];
        } else {
            return _AM.images[image_idx].sent.disp[word_coord.line][word_coord.word_idx];
        }
    }

    function image_auto_scroll(title, word_coord)
    {
        var text_group = document.getElementById('svg_image_text_group_' + title);
        var scroll_idx = parseInt(text_group.getAttribute('data-scroll_idx'));
        var max_idx = parseInt(text_group.getAttribute('data-max_idx'));

        if (scroll_idx > word_coord.line || scroll_idx + (_AM.images[title].sent_display_lines - 1) <= word_coord.line) {
            scroll_idx = word_coord.line - (_AM.images[title].sent_display_lines - 2);
            if (scroll_idx < 0) {
                scroll_idx = 0;
            }else if(scroll_idx > max_idx){
                scroll_idx = max_idx;
            }
            text_group.setAttributeNS(null, 'data-scroll_idx', scroll_idx);
            text_group.setAttributeNS(null, 'transform', 'translate(0, ' + -scroll_idx * (_AM.images[title].sent_height + 2 * _AM.scene_text_ver_spacing) + ')');
        }

        if (scroll_idx == 0) {
            var scroll_up = document.getElementById('svg_image_text_scrollup_' + title);
            //scroll_up.setAttributeNS(null, 'x', '-200');
            scroll_up.setAttributeNS(null, 'visibility', 'hidden');
        } else {
            var scroll_up = document.getElementById('svg_image_text_scrollup_' + title);
            //scroll_up.setAttributeNS(null, 'x', _AM.images[title].sent_clip_box[2]);
            scroll_up.setAttributeNS(null, 'visibility', 'visible');
        }

        if (scroll_idx == max_idx || _AM.images[title].sent.disp.length - _AM.images[title].sent_display_lines <= 0) {            
            var scroll_down = document.getElementById('svg_image_text_scrolldown_' + title);
            scroll_down.setAttributeNS(null, 'visibility', 'hidden');
            //scroll_down.setAttributeNS(null, 'x', '-200');
        } else {
            var scroll_down = document.getElementById('svg_image_text_scrolldown_' + title);
            //scroll_down.setAttributeNS(null, 'x', _AM.images[title].sent_clip_box[2]);
            scroll_down.setAttributeNS(null, 'visibility', 'visible');
        }
    }
   

    function update_image_scramble_complete(image_group_name) {
        //count how many current sentences in the group are complete.
        //if (_AM.scramble_mode) {
            var cnt_sent = 0;
            var cnt_comp = 0;
            var i = 0;
            //for (i = 0; i < current_scene.images.length; i++) {
            var test_image;
            for (var key in _AM.images) {
                if (_AM.images.hasOwnProperty(key)) {
                    test_image = _AM.images[key];
                    if (test_image.scene_title == current_scene.title) {
                        if (image_group_name == test_image.image_group && !test_image.sent_is_scramble && test_image.sent) {
                            cnt_sent++;
                            if (test_image.sent_is_complete || !((!test_image.needed || _AM.check_bag(test_image.needed)) && !test_image.is_displayed)) {
                                //count it if its complete or is not displayed, if its not displayed in the group its because its not available option.
                                cnt_comp++;
                            }
                        }
                    }
                }
            }

            //current group is complete, scramble textboxs for this sentence group is no longer needed.
            if (cnt_sent == cnt_comp) {
                //for (i = 0; i < current_scene.images.length; i++) {
                for (var key in _AM.images) {
                    if (_AM.images.hasOwnProperty(key)) {
                        test_image = _AM.images[key];
                        if (test_image.scene_title == current_scene.title) {
                            if (image_group_name == test_image.image_group) {
                                if (test_image.sent_is_scramble) {
                                    //hide the scramble sentence and mark the scramble sentence as not to be displayed again!
                                    test_image.sent_is_complete = true;
                                    //test_image.image_svg_group.setAttributeNS(null, 'class', test_image.animate_shape_class + '_hide');
                                }
                            }
                        }
                    }
                }

            } else {
                //for (i = 0; i < current_scene.images.length; i++) {
                for (var key in _AM.images) {
                    if (_AM.images.hasOwnProperty(key)) {
                        test_image = _AM.images[key];
                        if (test_image.scene_title == current_scene.title) {
                            if (image_group_name == test_image.image_group) {
                                if (test_image.sent_is_scramble && test_image.sent_is_complete) {
                                    test_image.sent_is_complete = false;
                                }
                            }
                        }
                    }
                }
            }
        //}
    }
    
    function image_scramble_display_toggle(image_group_name)
    {
        //if (_AM.scramble_mode) {
            //count how many current sentences in the group are complete.
            var cnt_sent = 0;
            var cnt_comp = 0;
            var i = 0;
            var test_image;
            //for (i = 0; i < current_scene.images.length; i++) {
            for (var key in _AM.images) {
                if (_AM.images.hasOwnProperty(key)) {
                    test_image = _AM.images[key];
                    if (test_image.scene_title == current_scene.title) {
                        if (image_group_name == test_image.image_group && !test_image.sent_is_scramble && test_image.sent) {
                            cnt_sent++;
                            if (test_image.sent_is_complete || !test_image.is_displayed) {
                                //count it if its complete or is not displayed, if its not displayed in the group its because its not available option.
                                cnt_comp++;
                            }
                        }
                    }
                }
            }

            //current group is complete, scramble textboxs for this sentence group is no longer needed.
            if (cnt_sent == cnt_comp) {
                //for (i = 0; i < current_scene.images.length; i++) {
                for (var key in _AM.images) {
                    if (_AM.images.hasOwnProperty(key)) {
                        test_image = _AM.images[key];
                        if (test_image.scene_title == current_scene.title) {
                            if (image_group_name == test_image.image_group) {
                                if (test_image.sent_is_scramble) {
                                    //hide the scramble sentence and mark the scramble sentence as not to be displayed again!
                                    test_image.sent_is_complete = true;
                                    test_image.image_svg_group.setAttributeNS(null, 'class', test_image.animate_shape_class + '_hide');



                                }/* Make all select optinos. else {
                        if (current_scene.sentences[i].can_select || current_scene.sentences[i].next_sentence_group) {
                            if (current_scene.sentences[i].is_displayed && $(current_scene.sentences[i].words_html[current_scene.sentences[i].words_html.length - 1]).css('opacity') != "1") {
                                //only wire up the event once.
                                $(current_scene.sentences[i].words_html[current_scene.sentences[i].words_html.length - 1]).on("click", { ii: i }, function (event) { sent = current_scene.sentences[event.data.ii]; event.stopPropagation(); self = this; sentence_focus(self); sentence_selected(self); });
                                //$(current_scene.sentences[i].words_html[current_scene.sentences[i].words_html.length - 1]).on("touchend", { ii: i }, function (event) { sent = current_scene.sentences[event.data.ii]; event.stopPropagation(); self = this; sentence_focus(self); sentence_selected(self); if ($.isFunction(sent.word_functions[sent.word_functions.length - 1])) { sent.word_functions[sent.word_functions.length - 1](); } });
                                $(current_scene.sentences[i].words_html[current_scene.sentences[i].words_html.length - 1]).css('opacity', 1);
                            }
                        }
                    }*/

                            }
                        }
                    }
                }

            } else {
                //*** TO DO: add code to show the scramble text box only when its not already displayed!
                //for (i = 0; i < current_scene.images.length; i++) {
                for (var key in _AM.images) {
                    if (_AM.images.hasOwnProperty(key)) {
                        test_image = _AM.images[key];
                        if (test_image.scene_title == current_scene.title) {
                            if (image_group_name == test_image.image_group) {
                                if (test_image.sent_is_scramble && test_image.sent_is_complete) {
                                    //test_image.sent_is_complete = true;
                                    //test_image.image_svg_group.setAttributeNS(null, 'class', image.animate_shape_class + '_show');
                                    test_image.sent_is_complete = false;
                                    test_image.image_svg_group.setAttributeNS(null, 'class', test_image.animate_shape_class + '_show');
                                }
                            }
                        }
                    }
                }

                //for (i = 0; i < current_scene.images.length; i++) {               
                for (var key in _AM.images) {
                    if (_AM.images.hasOwnProperty(key)) {
                        test_image = _AM.images[key];
                        //***TO DO: test this now only works with currently displayed sentences.
                        if (test_image.scene_title == current_scene.title) {
                            if (image_group_name == test_image.image_group && !test_image.sent_is_scramble && !test_image.sent_is_complete && test_image.is_displayed) {
                                //found first sentence in list in this group that is not complete, set its focus.
                                //sentence_focus(test_image.sent_div);
                                image_focus(test_image.title);
                                break;
                            }
                        }
                    }
                }
            }
        //}
    }

    function image_word_animate_helper(from_image_idx, from_word_idx, to_image_idx, to_word_idx, last_time, from_cur_x, from_cur_y, last_from_x, last_from_y, start_time, duration)
    {
        //get location and destination.
        var from_svg_text = document.getElementById('svg_image_text_span_' + from_image_idx + '_' + from_word_idx);
        var to_svg_text = document.getElementById('svg_image_text_span_' + to_image_idx + '_' + to_word_idx);        
        
        var text_group;

        var cur_t = new Date().getTime();
        var t = (cur_t - start_time);
        var tr = duration - t;
        var dt = (t - last_time);

        var scroll_idx;

        var to_cur_x = parseFloat(to_svg_text.getAttributeNS(null, 'data_x'));
        var to_cur_y = parseFloat(to_svg_text.getAttributeNS(null, 'data_y'));

        if (from_cur_x == null) {
            from_cur_x = parseFloat(from_svg_text.getAttributeNS(null, 'data_x'));
        }

        if (from_cur_y == null) {
            from_cur_y = parseFloat(from_svg_text.getAttributeNS(null, 'data_y'));

            //need to adjust from_cur_y based on scroll position. Only need to do this on first call.
            //text_group2 = document.getElementById('svg_image_text_group_' + from_image_idx);
            //scroll_idx2 = text_group2.getAttributeNS(null, 'data-scroll_idx');
            //from_cur_y -= scroll_idx2 * (_AM.images[from_image_idx].sent_height + 2 * _AM.scene_text_ver_spacing);

            scroll_idx = document.getElementById('svg_image_text_group_' + from_image_idx).getAttributeNS(null, 'data-scroll_idx');
            from_cur_y -= scroll_idx * (_AM.images[from_image_idx].sent_height + 2 * _AM.scene_text_ver_spacing);

            //move it up the distance to clear finger from clicking it.
            //from_cur_y -= (_AM.images[from_image_idx].sent_height + 2 * _AM.scene_text_ver_spacing);
        }

        //need to adjust to_cur_y based on scroll position.
        //var text_group = document.getElementById('svg_image_text_group_' + to_image_idx);
        //var scroll_idx = text_group.getAttributeNS(null, 'data-scroll_idx');
        //to_cur_y -= scroll_idx * (_AM.images[to_image_idx].sent_height + 2 * _AM.scene_text_ver_spacing);                     
        scroll_idx = document.getElementById('svg_image_text_group_' + to_image_idx).getAttributeNS(null, 'data-scroll_idx');
        to_cur_y -= scroll_idx * (_AM.images[to_image_idx].sent_height + 2 * _AM.scene_text_ver_spacing);

        if (last_from_x == null) {
            last_from_x = 0
        }
        
        if (last_from_y == null) {
            last_from_y = 0         
        }               

        //when t = 0 we need to be at the from word location.
        //so at t = duration we need to be at the to word location.
        if (t >= duration || dt >= tr) {           
            last_from_x = to_cur_x - from_cur_x;
            last_from_y = to_cur_y - from_cur_y;

            //fade it out and schedule for removal.
            //after animation is complete, highlight next word.
            
            /*g = document.getElementById('svg_image_main_group_word_animate' + from_image_idx + '_' + from_word_idx);
            g.setAttributeNS(null, 'transform', 'translate(' + last_from_x + ', ' + last_from_y + ')');
            $('#svg_image_main_group_word_animate' + from_image_idx + '_' + from_word_idx).remove();
            _AM.svg_container.appendChild(g);*/

            text_group = document.getElementById('svg_image_text_group_word_animate' + from_image_idx + '_' + from_word_idx);            
            text_group.setAttributeNS(null, 'class', _AM.images[from_image_idx].animate_shape_class + '_hide');                    
            text_group.setAttributeNS(null, 'transform', 'translate(' + last_from_x + ', ' + last_from_y + ')');

            //animation made it over, show the text.
            document.getElementById('svg_image_text_span_' + to_image_idx + '_' + to_word_idx).setAttributeNS(null, 'class', _AM.images[to_image_idx].animate_shape_class + '_text_show');            

            //this allows for 2 seconds on the fade out, so if the screen moves while its fading out, the translation does too.
            if (t < duration + scene_fade_text_time_remove_delay) {
                setTimeout(function () { image_word_animate_helper(from_image_idx, from_word_idx, to_image_idx, to_word_idx, last_time, from_cur_x, from_cur_y, last_from_x, last_from_y, start_time, duration); }, 41);
            } else {
                $('#svg_image_main_group_word_animate' + from_image_idx + '_' + from_word_idx).remove();
                //then time to remove the svg group from the dom.                
                //$('#svg_image_text_group_word_animate' + from_image_idx + '_' + from_word_idx).remove();
                //$('#svg_image_clip_group_word_animate' + from_image_idx + '_' + from_word_idx).remove();

                //show select option if its the last word.  
                //var image = _AM.images[to_image_idx];
                if (_AM.images[to_image_idx].sent_can_select || _AM.images[to_image_idx].next_image_group) {
                    //revealed_idx+1 because it has not been incremented yet.
                    if (_AM.images[to_image_idx].sent_revealed_idx >= _AM.images[to_image_idx].word_count && (_AM.scramble_mode || _AM.none_mode)) {
                        document.getElementById('svg_image_text_select_' + to_image_idx).setAttributeNS(null, 'class', _AM.images[to_image_idx].animate_shape_class + '_image_show');
                    }
                }


            }
            
        } else if (t < duration && dt < tr) {
            last_from_x += (to_cur_x-(from_cur_x+last_from_x)) / tr * dt;
            last_from_y += (to_cur_y-(from_cur_y+last_from_y)) / tr * dt;
            last_time = t;

            //update position.
            text_group = document.getElementById('svg_image_text_group_word_animate' + from_image_idx + '_' + from_word_idx);
            //perform transformation.
            text_group.setAttributeNS(null, 'transform', 'translate(' + last_from_x + ', ' + last_from_y + ')');

            //$('svg_image_text_group_word_animate' + from_image_idx + '_' + from_word_idx).remove();
            //_AM.svg_container.appendChild(text_group);

            setTimeout(function () { image_word_animate_helper(from_image_idx, from_word_idx, to_image_idx, to_word_idx, last_time, from_cur_x, from_cur_y, last_from_x, last_from_y, start_time, duration); }, 41);
        }

        //force screen update.
        /*var svg_text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        svg_text.setAttributeNS(null, 'id', 'temp_text');
        var svg_text_span = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        var textNode = document.createTextNode('temp_text');
        
        svg_text_span.appendChild(textNode);
        svg_text.appendChild(svg_text_span);
        _AM.svg_container.insertBefore(svg_text, _AM.svg_container.childNodes[0]);
        $('#temp_text').remove();*/
    }
    
    function image_word_animate(from_image_idx, from_word_idx, to_image_idx, to_word_idx, duration)
    {
        //var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        //g.setAttributeNS(null, 'id', 'svg_image_main_group_word_animate' + from_image_idx + '_' + from_word_idx);

        //var clip_path = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
        //var clip_rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        //clip_path.appendChild(clip_rect);
        //g.appendChild(clip_path);        

        var text_group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        text_group.setAttributeNS(null, 'style', 'font-size:' + _AM.video_intrinsic_font_size + 'px;'); 
        text_group.setAttributeNS(null, 'id', 'svg_image_text_group_word_animate' + from_image_idx + '_' + from_word_idx);
        text_group.setAttributeNS(null, 'class', _AM.images[from_image_idx].animate_shape_class + '_scramble_show');        

        //TO DO: remove this after animation.
        //_AM.svg_container.appendChild(text_group);
        //g.appendChild(text_group);
        _AM.svg_container.appendChild(text_group);

        var svg_text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        svg_text.setAttributeNS(null, 'id', 'svg_image_text_word_animate' + from_image_idx + '_' + from_word_idx);

        var h = _AM.images[from_image_idx].sent_height; //_AM.video_intrinsic_font_size * _AM.scene_text_ver_spacing;
        var dx = _AM.scene_text_hor_spacing;
        var dy = _AM.scene_text_ver_spacing;

        //get the x and y positino of the current text element.
        var svg_from_text = document.getElementById('svg_image_text_span_' + from_image_idx + '_' + from_word_idx);
        //var svg_from_text = document.getElementById('svg_image_text_span_' + to_image_idx + '_' + to_word_idx);
        var cur_x = parseFloat(svg_from_text.getAttributeNS(null, 'data_x'));
        var cur_y = parseFloat(svg_from_text.getAttributeNS(null, 'data_y'));

        //text_group = document.getElementById('svg_image_text_group_' + from_image_idx);
        //scroll_idx = text_group.getAttributeNS(null, 'data-scroll_idx');        
        var scroll_idx = document.getElementById('svg_image_text_group_' + from_image_idx).getAttributeNS(null, 'data-scroll_idx');
        //var scroll_idx = document.getElementById('svg_image_text_group_' + to_image_idx).getAttributeNS(null, 'data-scroll_idx');
        cur_y -= scroll_idx * (_AM.images[from_image_idx].sent_height + 2 * _AM.scene_text_ver_spacing);

        //move it up the height of the word, to clear finger clicking it.
        //cur_y -= (_AM.images[from_image_idx].sent_height + 2 * _AM.scene_text_ver_spacing);

        svg_text.setAttributeNS(null, 'x', cur_x);
        svg_text.setAttributeNS(null, 'y', cur_y);//-h);

        //svg_parent.appendChild(svg_text);
        text_group.appendChild(svg_text);

        var svg_text_span = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        //svg_text_span.setAttributeNS(null, 'dx', dx);
        //svg_text_span.setAttributeNS(null, 'id', 'svg_image_text_span_animate_' + from_image_idx + '_' + from_word_idx);     
        svg_text_span.setAttributeNS(null, 'class', _AM.images[from_image_idx].animate_shape_class + '_scramble_text_show');
        
        //set dx, dy for relative position of text.
        var word_coord = get_word_coords(from_image_idx, from_word_idx);
        var textNode = document.createTextNode(_AM.images[from_image_idx].sent.disp[word_coord.line][word_coord.word_idx]);
        svg_text_span.appendChild(textNode);
        svg_text.appendChild(svg_text_span);

        var wth = svg_text_span.getComputedTextLength() + 2*dx;

        //now build rectangles.
        var svg_rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        //svg_rect.setAttributeNS(null, 'id', 'svg_image_text_rect_animate_' + from_image_idx + '_' + from_word_idx);
        svg_rect.setAttributeNS(null, 'x', cur_x - dx);
        svg_rect.setAttributeNS(null, 'y', cur_y + _AM.images[from_image_idx].sent_text_tale_height - _AM.images[from_image_idx].sent_height - dy);// - h);
        svg_rect.setAttributeNS(null, 'width', wth);
        svg_rect.setAttributeNS(null, 'height', _AM.images[from_image_idx].sent_height + dy);
        svg_rect.setAttributeNS(null, 'class', _AM.images[from_image_idx].animate_shape_class + '_scramble_text_box_show');
                
        //add text_group to screen.
        text_group.insertBefore(svg_rect, svg_text);              

        //hide the original word that was clicked.
        document.getElementById('svg_image_text_rect_' + from_image_idx + '_' + from_word_idx).setAttributeNS(null, 'class', _AM.images[from_image_idx].animate_shape_class + '_text_box_hide');
        document.getElementById('svg_image_text_span_' + from_image_idx + '_' + from_word_idx).setAttributeNS(null, 'class', _AM.images[from_image_idx].animate_shape_class + '_text_hide');
       

        /*clip_path.setAttributeNS(null, 'id', 'svg_image_clip_group_word_animate' + from_image_idx + '_' + from_word_idx);
        clip_rect.setAttributeNS(null, 'id', 'svg_image_clip_rect_group_word_animate' + from_image_idx + '_' + from_word_idx);
        clip_rect.setAttributeNS(null, 'x', cur_x - dx);
        clip_rect.setAttributeNS(null, 'y', cur_y + _AM.images[from_image_idx].sent_text_tale_height - _AM.images[from_image_idx].sent_height - dy);
        //need to make this get it from the curve.
        clip_rect.setAttributeNS(null, 'width', wth);
        clip_rect.setAttributeNS(null, 'height', _AM.images[from_image_idx].sent_height + dy);
        //clip_path.appendChild(clip_rect);
*/
        //now we are ready to start the timer to get it to the destination.
        var start_time = new Date().getTime();
        setTimeout(function () { image_word_animate_helper(from_image_idx, from_word_idx, to_image_idx, to_word_idx, start_time, duration); }, 41);

        //requestAnimationFrame(function () { image_word_animate_helper(from_image_idx, from_word_idx, to_image_idx, to_word_idx, 0, null, null, null, null, start_time, duration); });
    }

    function image_word_selected(image_idx, word_idx) {

        //***TO DO:re-enable word triggers they are currently disabled.
        //$(current_scene.sentences[sentence_idx].words_html[word_idx]).trigger("on_selected", { typ: "word", sentence: current_scene.sentences[sentence_idx], word_index: word_idx });
        var wrong=false;
        console.log("image_word_selected");
        if (_AM.images[image_idx].sent_is_scramble) {
            //scramble sentence word selected.
            //check to see if word matches on current focus image sent
            if (current_scene.current_image) {
                //var current_word_idx = current_scene.current_image.sent_revealed_idx;

                var current_word_coord = get_word_coords(current_scene.current_image.title, current_scene.current_image.sent_revealed_idx);
                var scramble_word_coord = get_word_coords(image_idx, word_idx);

                if (current_word_coord && get_word(current_scene.current_image.title, current_word_coord) == get_word(image_idx, scramble_word_coord)) {
                    //scramble word matches the expected word.

                    //scroll to it, unless audio is playing... probably playing back the sentence, let playback rule over this auto scroll.
                    if (!is_audio_playing) {
                        image_auto_scroll(current_scene.current_image.title, current_word_coord);
                    }

                    //animate word over.
                    image_word_animate(image_idx, word_idx, current_scene.current_image.title, current_scene.current_image.sent_revealed_idx, scene_move_text_time);

                    /*var current_word_coord;
                    var rect = document.getElementById('svg_image_text_rect_' + current_scene.current_image.title + '_' + current_scene.current_image.sent_revealed_idx);
                    if (rect) {
                        current_word_coord = get_word_coords(current_scene.current_image.title, current_scene.current_image.sent_revealed_idx);
                        rect.setAttributeNS(null, 'class', 'story_svg_text_box_hide');
                    }*/
                    document.getElementById('svg_image_text_rect_' + current_scene.current_image.title + '_' + current_scene.current_image.sent_revealed_idx).setAttributeNS(null, 'class', current_scene.current_image.animate_shape_class + '_text_box_hide');

                    //move along to next word.
                    current_scene.current_image.sent_revealed_idx++;

                    //potentially hide the scramble text box if all complete.
                    if (current_scene.current_image.sent_revealed_idx >= current_scene.current_image.word_count) {
                        current_scene.current_image.sent_is_complete = true;
                        image_scramble_display_toggle(current_scene.current_image.image_group);
                    }

                    if (!is_audio_playing) {
                        var rect = document.getElementById('svg_image_text_rect_' + current_scene.current_image.title + '_' + current_scene.current_image.sent_revealed_idx);

                        if (rect) {
                            current_word_coord = get_word_coords(current_scene.current_image.title, current_scene.current_image.sent_revealed_idx);
                            //scroll to it, unless audio is playing... probably playing back the sentence, let playback rule over this auto scroll.

                            image_auto_scroll(current_scene.current_image.title, current_word_coord);

                            rect.setAttributeNS(null, 'class', current_scene.current_image.animate_shape_class + '_text_box_show');
                        } else {
                            //must be at the end of the sentence... shall we see about enabling the select option???
                        }
                    }

                    //force block level change for some browsers to prioritize the change.
                    //*********************************//
                    document.getElementById('svg_image_' + current_scene.current_image.title).style.display = 'none';
                    document.getElementById('svg_image_' + current_scene.current_image.title).offsetHeight;
                    document.getElementById('svg_image_' + current_scene.current_image.title).style.display = 'block';

                    console.log("image_word_selected_complete");
                    return;
                } else {
                    wrong = true;
                }
            }
        } 
            //no scramble, sentence word selected.
            
        //var current_word_coord = get_word_coords(current_scene.current_image.title, current_scene.current_image.sent_revealed_idx);
        var current_word_coord = get_word_coords(image_idx, word_idx);

        //vary the following styling based on if wrong is true or false.
        //play the word that was clicked.
            if (!is_audio_playing) {
                //construct file name to use.
                var filename = get_filename(image_idx, current_word_coord);

                var rect = document.getElementById('svg_image_text_rect_' + image_idx + '_' + _AM.images[image_idx].sent_revealed_idx);
                if (rect) {
                    rect.setAttributeNS(null, 'class', _AM.images[image_idx].animate_shape_class + '_text_box_hide');
                } 
                rect = document.getElementById('svg_image_text_rect_' + image_idx + '_' + word_idx);
                if (rect) {
                    rect.setAttributeNS(null, 'class', _AM.images[image_idx].animate_shape_class + '_text_box_show');
                }

                //add audio sub path.
                $(audio_streams[audio_stream_on_demand_word_idx]).off();
                $(audio_streams[audio_stream_on_demand_word_idx]).on("canplay", function (event) {
                    is_audio_playing = 1;
                    audio_streams[audio_stream_on_demand_word_idx][alb]();
                });

                $(audio_streams[audio_stream_on_demand_word_idx]).on("ended", { title: image_idx, word_id: word_idx }, function (event) {
                    is_audio_playing = 0;

                    var rect = document.getElementById('svg_image_text_rect_' + event.data.title + '_' +  event.data.word_id);
                    if (rect) {                        
                        rect.setAttributeNS(null, 'class', _AM.images[event.data.title].animate_shape_class + '_text_box_hide');
                    }

                    rect = document.getElementById('svg_image_text_rect_' + event.data.title + '_' + _AM.images[event.data.title].sent_revealed_idx);
                    if (rect) {
                        rect.setAttributeNS(null, 'class', _AM.images[event.data.title].animate_shape_class + '_text_box_show');
                    }

                    //force block level change for some browsers to prioritize the change.
                    //*********************************//
                    document.getElementById('svg_image_' + event.data.title).style.display = 'none';
                    document.getElementById('svg_image_' + event.data.title).offsetHeight;
                    document.getElementById('svg_image_' + event.data.title).style.display = 'block';
                });

                $(audio_streams[audio_stream_on_demand_word_idx]).on("stalled", { title: image_idx, word_id: word_idx }, function (event) {
                    is_audio_playing = 0;

                    var rect = document.getElementById('svg_image_text_rect_' + event.data.title + '_' + event.data.word_id);
                    if (rect) {
                        rect.setAttributeNS(null, 'class', _AM.images[event.data.title].animate_shape_class + '_text_box_hide');
                    }

                    rect = document.getElementById('svg_image_text_rect_' + event.data.title + '_' + _AM.images[event.data.title].sent_revealed_idx);
                    if (rect) {
                        rect.setAttributeNS(null, 'class', _AM.images[event.data.title].animate_shape_class + '_text_box_show');
                    }

                    //TODO: TTS use text to speech synthesis.
                    //force block level change for some browsers to prioritize the change.
                    //*********************************//
                    document.getElementById('svg_image_' + event.data.title).style.display = 'none';
                    document.getElementById('svg_image_' + event.data.title).offsetHeight;
                    document.getElementById('svg_image_' + event.data.title).style.display = 'block';
                });

                $(audio_streams[audio_stream_on_demand_word_idx]).on("error", { title: image_idx, word_id: word_idx }, function (event) {
                    is_audio_playing = 0;

                    var rect = document.getElementById('svg_image_text_rect_' + event.data.title + '_' + event.data.word_id);
                    if (rect) {
                        rect.setAttributeNS(null, 'class', _AM.images[event.data.title].animate_shape_class + '_text_box_hide');
                    }

                    rect = document.getElementById('svg_image_text_rect_' + event.data.title + '_' + _AM.images[event.data.title].sent_revealed_idx);
                    if (rect) {
                        rect.setAttributeNS(null, 'class', _AM.images[event.data.title].animate_shape_class + '_text_box_show');
                    }

                    //TODO: TTS use text to speech synthesis.
                    //force block level change for some browsers to prioritize the change.
                    //*********************************//
                    document.getElementById('svg_image_' + event.data.title).style.display = 'none';
                    document.getElementById('svg_image_' + event.data.title).offsetHeight;
                    document.getElementById('svg_image_' + event.data.title).style.display = 'block';
                });

                precache_audio(audio_streams[audio_stream_on_demand_word_idx], filename);
            }

        //force block level change for some browsers to prioritize the change.
        //*********************************//
        document.getElementById('svg_image_' + current_scene.current_image.title).style.display = 'none';
        document.getElementById('svg_image_' + current_scene.current_image.title).offsetHeight;
        document.getElementById('svg_image_' + current_scene.current_image.title).style.display = 'block';
        console.log("image_word_selected_complete");
    }

    function image_focus(title) {
        
        if (!is_audio_playing && !_AM.images[title].sent_is_scramble) {
            var rect;
            //debug_log("[sentence_focus]: focus called");
            if (_AM.scramble_mode) {
                //un-highlight the next word you are supposed to be reading.
                if (current_scene.current_image && !current_scene.current_image.sent_is_complete) {
                    //$('#div_inner_word_' + current_scene.sentence_idx + '_' + current_scene.current_sentence.revealed_idx).attr('class', 'story_div_inner_word_notselected_hidden');
                    //svg_image_text_rect_' + image.title + '_' + word_count
                    rect = document.getElementById('svg_image_text_rect_' + current_scene.current_image_idx + current_scene.current_image.sent_revealed_idx);
                    if (rect) {
                        rect.setAttributeNodeNS(null, 'class', current_scene.current_image.animate_shape_class + '_text_box_hide');
                    }
                }
            }

            //remove any existing focus sentences.
            //$('.story_div_sentence_focus').attr('class', 'story_div_sentence_nofocus');
            if (current_scene.current_image) {
                current_scene.current_image.image_svg_path.setAttributeNS(null, 'class', current_scene.current_image.animate_shape_class + '_path');
            }
            //focus on the currently selected sentence.
            //$('#story_div_sentence_' + sentence_idx).attr('class', 'story_div_sentence_focus');
            _AM.images[title].image_svg_path.setAttributeNS(null, 'class', _AM.images[title].animate_shape_class + '_path_focus');

            //check to see if sentence has changed, if it has invalidate the audio cache.
            //if(current_scene.current_sentence){
            if (!current_scene.current_image || (current_scene.current_image && current_scene.current_image.title != title)) {
                audio_streams_cache_invalidated = true;
                //debug_log("[sentence_focus]: audio cache invalidated");
                //sentence changed, remove previously added karma
                //debug_log("[sentence_focus]: current karma = " + _AM.save_data.karma);
                if (current_scene.current_image) {
                    _AM.save_data.karma -= current_scene.current_image.karma;
                }
                //debug_log("[sentence_focus]: karma changed by " + current_scene.current_sentence.karma + " karma = " + _AM.save_data.karma);

                current_scene.current_image = _AM.images[title];
                current_scene.current_image_idx = title;

                //add karma for selection.
                _AM.save_data.karma += current_scene.current_image.karma;
                //debug_log("[sentence_focus]: karma changed by " + current_scene.current_sentence.karma + " karma = " + _AM.save_data.karma);
            } /*else {
                //sentence did not change, do not need to update karma.
                current_scene.current_sentence = current_scene.sentences[sentence_idx];
                current_scene.sentence_idx = sentence_idx;                
            }*/

            if (_AM.scramble_mode) {
                //***TODO: this audio playing check needs to be verified as ok, this selected event occurs with sentence click, but also when the speaker is clicked.
                //if this event is raised before the speaker event this will mess up, verify that it always calls speaker event first then bubbles up, then its ok.
                //need to set next word focus, if this was triggered by speaker press we do not want to update this.
                //if (!is_audio_playing) {
                //if (current_scene.current_image.sent_revealed_idx < get_word_length(current_scene.current_image.sent.disp) && current_scene.current_image.sent_is_complete == false) {
                //was .word_count+1 changed to word_count.
                if (current_scene.current_image.sent_revealed_idx < current_scene.current_image.word_count && current_scene.current_image.sent_is_complete == false) {
                    //$('#div_inner_word_' + sentence_idx + '_' + current_scene.current_sentence.revealed_idx).attr('class', 'story_div_inner_word_focus_hidden');
                    rect = document.getElementById('svg_image_text_rect_' + current_scene.current_image_idx + current_scene.current_sentence.revealed_idx);
                    rect.setAttributeNodeNS(null, 'class', current_scene.current_image.animate_shape_class + '_text_box_show');
                }
                //}
            }
        }

        
        if (_AM.images[title].sent) {
            //force block level change for some browsers to prioritize the change.
            //*********************************//
            document.getElementById('svg_image_' + title).style.display = 'none';
            document.getElementById('svg_image_' + title).offsetHeight;
            document.getElementById('svg_image_' + title).style.display = 'block';
        }
    }

    function remove_image(image, image_selected)
    {
        //try and delete the displayed property.
        if (current_scene.displayed) {
            if (image.image_group in current_scene.displayed) {
                delete current_scene.displayed[image.image_group];
            }
            //current_scene.displayed[image_group] = true;
        }

        if (image_selected) {                        
            setTimeout(function () { image.is_displayed = false; $(image.image_svg_group).remove(); _AM.display_image_group(image_selected.next_image_group, "fast"); }, scene_fade_text_time_remove_delay);
        } else {
            setTimeout(function () { image.is_displayed = false; $(image.image_svg_group).remove(); }, scene_fade_text_time_remove_delay);
        }
    }

    //this works only for next_image_groups, other functions need to register to listen for on_selected.
    function image_selected(image_idx) {                       
        var test_image;        
        var hide_groups = _AM.images[image_idx].hide_image_groups.split(',');
        var first_time = 1;

        for (var key in _AM.images) {
            if (_AM.images.hasOwnProperty(key)) {
                test_image = _AM.images[key];

                if (hide_groups.indexOf(test_image.image_group) > -1) {
                    $(test_image).trigger("on_hide", { typ: "scene_image", scene_image: test_image });

                    if (test_image.is_displayed) {
                        test_image.is_displayed = false;
                        test_image.image_svg_group.setAttributeNS(null, 'class', test_image.animate_shape_class + '_hide');

                        if (first_time && _AM.images[image_idx].image_group == test_image.image_group && _AM.images[image_idx].next_image_group != null) {
                            first_time = 0;
                            //force fast fade in of next image group.
                            remove_image(test_image, _AM.images[image_idx]);
                        } else {
                            //hide the current image group.
                            remove_image(test_image, null);
                        }
                    } 
                }
            }
        }


                /*if (_AM.images[image_idx].next_image_group) {
                    //this was not a scene change but sentence displayed change, remove old sentences add new, and do it quickly
                    //setTimeout(function () {
                    var first_time = 1;
                    if (current_scene) {  
                        //for (s = 0; s < current_scene.images.length; s++) {
                        for (var key in _AM.images) {
                            if (_AM.images.hasOwnProperty(key)) {
                                test_image = _AM.images[key];
                                
                                if (test_image.image_group == _AM.images[image_idx].image_group) {
                                    $(test_image).trigger("on_hide", { typ: "scene_image", scene_image: test_image });
                                    if (first_time == 1 && test_image.is_displayed) {
                                        test_image.is_displayed = false;
                                        //include additional code to fade in fast the new sentence_group - handled in remove_image
                                        first_time = 0;
                                        test_image.image_svg_group.setAttributeNS(null, 'class', test_image.animate_shape_class + '_hide');
                                        remove_image(test_image, _AM.images[image_idx]);
        
                                    } else if (test_image.is_displayed) {
                                        test_image.is_displayed = false;
                                        test_image.image_svg_group.setAttributeNS(null, 'class', test_image.animate_shape_class + '_hide');
                                        remove_image(test_image, null);
        
                                    }
                                }
                            }
                        }
                    }        
                } else if (_AM.images[image_idx].sent) {
                    //it was a sentence selected, assume their is a listener to progress to next scene, remove the sentences.
                    //this was not a scene change but sentence displayed change, remove old sentences add new, and do it quickly
                    //setTimeout(function () {    
                    if (current_scene) {
                        //for (s = 0; s < current_scene.images.length; s++) {
                        for (var key in _AM.images) {
                            if (_AM.images.hasOwnProperty(key)) {
                                test_image = _AM.images[key];
                                //var i = s;
                                if (test_image.image_group == _AM.images[image_idx].image_group) {
                                    $(test_image).trigger("on_hide", { typ: "scene_image", scene_image: test_image });
                                    if (test_image.is_displayed) {
                                        test_image.is_displayed = false;
                                        test_image.image_svg_group.setAttributeNS(null, 'class', test_image.animate_shape_class + '_hide');
                                        remove_image(test_image, null);
        
                                    }
                                }
                            }
                        }
                    }
                }*/

        $(_AM.images[image_idx]).trigger("on_selected", { typ: "scene_image", scene_image: _AM.images[image_idx] });
    }

    function try_play_audio(title, to_word_idx)
    {
        if (audio_streams[audio_stream_idx % audio_stream_max].can_play)
        {
            //debug_log('[try_play_audio]: Playing audio from audio stream: ' + (audio_stream_idx % audio_stream_max) + ' for word number: ' + audio_stream_idx);

            //if (audio_stream_idx < _AM.images[image_id].revealed_idx) {
            //    $('#div_inner_word_' + current_scene.sentence_idx + '_' + audio_stream_idx).attr('class', 'story_div_inner_word_selected');
            var high_word = document.getElementById('svg_image_text_rect_' + title + '_' + audio_stream_idx)
            if(high_word){
                high_word.setAttributeNS(null, 'class', _AM.images[title].animate_shape_class + '_text_box_show');
                audio_streams[audio_stream_idx % audio_stream_max][alb]();
            }else{
                is_audio_playing = 0;
            }
                
            //} else {
            //    document.getElementById('svg_image_text_rect_' + image_id + '_' + audio_stream_idx).setAttributeNS(null, 'class', 'story_svg_text_box_focus');
            //}

            
        } else {            
            //TODO: check for audio error, if no error queue again, else handle error.
            if (audio_streams[audio_stream_idx % audio_stream_max].error == null || !audio_streams[audio_stream_idx % audio_stream_max].error.code) {
                _AM.setTimeout(function () { try_play_audio(title, to_word_idx); }, 100);
            } else {
                //TODO: TTS use text to speech synthesis.
                $(audio_streams[audio_stream_idx % audio_stream_max]).off("ended");
                play_next(title, to_word_idx);
            }
        }

        //force block level change for some browsers to prioritize the change.
        //*********************************//
        document.getElementById('svg_image_' + current_scene.current_image.title).style.display = 'none';
        document.getElementById('svg_image_' + current_scene.current_image.title).offsetHeight;
        document.getElementById('svg_image_' + current_scene.current_image.title).style.display = 'block';
    }       

    function word_selected(self)
    {       
        //construct file name to use.
        var sentence_idx = parseInt(self.getAttribute('data-sen-id'));
        var word_idx = parseInt(self.getAttribute('data-word-idx'));
                
        $(current_scene.sentences[sentence_idx].words_html[word_idx]).trigger("on_selected", { typ: "word", sentence:current_scene.sentences[sentence_idx], word_index: word_idx });

        //sentence changed too.
        if (current_scene.current_sentence.sentence_id != sentence_idx)
        {
            //debug_log('[word_selected]: current sentence does not equal this sentence, invalidating cache');
            //current_scene.current_sentence = current_scene.sentences[sentence_idx];            
            audio_streams_cache_invalidated = true;
        }
        
        //only play words on click if not currently selected.
        var class_name = $('#div_inner_word_' + current_scene.sentence_idx + '_' + word_idx).attr('class');
        if (class_name == 'story_div_inner_word_notselected' || class_name == 'story_div_inner_word_focus_hidden')
        {
            current_scene.current_sentence[alb](word_idx, word_idx);
        }
    }

    function check_word_match(rev_idx, sent_idx, word_idx)
    {
        //rev_idx refers to current_scene.current_sentence.
        str1 = current_scene.current_sentence.file_name_overrides[rev_idx];
        if (!str1) {
            str1 = current_scene.current_sentence.words[rev_idx]
        }

        //get the sentence that sent_idx referes to.
        str2 = current_scene.sentences[sent_idx].file_name_overrides[word_idx];
        if (!str2) {
            str2 = current_scene.sentences[sent_idx].words[word_idx]
        }
        
        //compares alternatives first.
        if (str1 == str2) {
            return 1;
        } else {
            return 0;
        }
    }

    function scramble_word_selected(self) {
        //data-word-idx
        var sentence_idx = parseInt(self.getAttribute('data-sen-id'));
        var word_idx = parseInt(self.getAttribute('data-word-idx'));

        //if (current_scene.current_sentence && check_word_match(current_scene.current_sentence.revealed_idx, self.getAttribute("data-sen-id"), self.getAttribute("data-word-idx"))) {
        if (current_scene.current_sentence && check_word_match(current_scene.current_sentence.revealed_idx, sentence_idx, word_idx)) {
            current_scene.current_sentence.is_first_time = false;
            
            $(current_scene.sentences[sentence_idx].words_html[word_idx]).trigger("on_selected", { typ: "word", sentence: current_scene.sentences[sentence_idx], word_index: word_idx, correct:true });

            //make copy of word for animating.
            var match_word = $('#div_inner_word_' + current_scene.sentence_idx + '_' + current_scene.current_sentence.revealed_idx);
            var os = match_word.offset();
            
            var div_word = build_scramble_word_html(self.getAttribute("data-word"), self.getAttribute('data-sen-id'));
            //make sure the new word is hidden.
            $(div_word).css('opacity', 0);

            //put copy overtop of existing word.
            //have to add it to the document first or offset will change the position to relative.
            _AM.html_container.appendChild(div_word);

            var off_set = $(self).offset(); 
            off_set.top -= $(div_word).height();
            //$(div_word).offset($(self).offset());
            $(div_word).offset({ top: off_set.top, left:off_set.left});

            //$("#secondElementId").offset({ top: offset.top, left: offset.left})
            //$(div_word).top -= $(div_word).height;

            //show copy of new word.
            //story_div_inner_word_scramble_correct
            $(div_word).children('div').attr('class', 'story_div_inner_word_scramble_correct');
            $(div_word).css('opacity', 1);

            //hide the existing word - no colapse of sentence.
            $(self).children('div').css('opacity', 0);
            //$(self).attr('class', 'story_div_outter_word_hidden');
            //$(self).children('div').attr('class', 'story_div_inner_word_scramble_hidden');

            os.left -= (match_word.outerWidth() - match_word.innerWidth()) / 2.0;
            os.top -= (match_word.outerHeight() - match_word.innerHeight()) / 2.0;

            match_word.attr('class', 'story_div_inner_word_notselected_hidden');
            //animate word to new location.
            $(div_word).animate({ left: os.left, top: os.top }, 2000, function () {
                // Animation complete.
                //show word in sentence.
                //hide word that was animated across.
                //$(div_word).css('opacity', 0);
                //match_word.css('opacity', 1);
                match_word.attr('class', 'story_div_inner_word_notselected');
                $(div_word).remove();

                //***TODO: maybe... Play next word, unless it was aborted by another animation.
            });

            if (current_scene.current_sentence.revealed_idx < current_scene.current_sentence.words.length - 1) {
                current_scene.current_sentence.revealed_idx++;
                
                if (!is_audio_playing) {
                    //stop highlight of next word, if the whole sentence is already being read.
                    $('#div_inner_word_' + current_scene.sentence_idx + '_' + current_scene.current_sentence.revealed_idx).attr('class', 'story_div_inner_word_focus_hidden');
                }
            } else { // if (current_scene.current_sentence.revealed_idx == current_scene.current_sentence.words.length - 1) {
                current_scene.current_sentence.revealed_idx++; //the check against revealed is always < so needs to go to full length.
                current_scene.current_sentence.is_complete = true;

                //display select buttons for this group, if all group is complete.

                var cnt_sent = 0;
                var cnt_comp = 0;
                for (i = 0; i < current_scene.sentences.length; i++)
                {
                    if (current_scene.current_sentence.sentence_group == current_scene.sentences[i].sentence_group && !current_scene.sentences[i].is_scramble)
                    {
                        cnt_sent++;
                        if (current_scene.sentences[i].is_complete || !current_scene.sentences[i].is_displayed) {
                            //count it if its complete or is not displayed, if its not displayed in the group its because its not available option.
                            cnt_comp++;
                        }
                    }
                }

                if (cnt_sent == cnt_comp) {
                    for (i = 0; i < current_scene.sentences.length; i++) {
                        if (current_scene.current_sentence.sentence_group == current_scene.sentences[i].sentence_group) {
                            if (current_scene.sentences[i].is_scramble) {
                                //hide the scramble sentence and mark the scramble sentence as not to be displayed again!
                                current_scene.sentences[i].is_complete = true; //update displaygroup.
                                $(current_scene.sentences[i].sent_div).fadeOut("fast", function () { $(this).remove(); });
                                //fade this out.
                            } else {
                                if (current_scene.sentences[i].can_select || current_scene.sentences[i].next_sentence_group) {
                                    if (current_scene.sentences[i].is_displayed && $(current_scene.sentences[i].words_html[current_scene.sentences[i].words_html.length - 1]).css('opacity') != "1") {
                                        //only wire up the event once.
                                        $(current_scene.sentences[i].words_html[current_scene.sentences[i].words_html.length - 1]).on("click", { ii: i }, function (event) { sent = current_scene.sentences[event.data.ii]; event.stopPropagation(); var self = this; sentence_focus(self); sentence_selected(self); });
                                        //$(current_scene.sentences[i].words_html[current_scene.sentences[i].words_html.length - 1]).on("touchend", { ii: i }, function (event) { sent = current_scene.sentences[event.data.ii]; event.stopPropagation(); self = this; sentence_focus(self); sentence_selected(self); if ($.isFunction(sent.word_functions[sent.word_functions.length - 1])) { sent.word_functions[sent.word_functions.length - 1](); } });
                                        $(current_scene.sentences[i].words_html[current_scene.sentences[i].words_html.length - 1]).css('opacity', 1);
                                    }
                                }
                            }
                        
                        }
                    }

                    

                } else {
                    //set focus to the next sentence in this group.
                    for (i = 0; i < current_scene.sentences.length; i++) {
                        //***TO DO: test this now only works with currently displayed sentences.
                        if (current_scene.current_sentence.sentence_group == current_scene.sentences[i].sentence_group && !current_scene.sentences[i].is_scramble && !current_scene.sentences[i].is_complete && current_scene.sentences[i].is_displayed) {
                            //found first sentence in list in this group that is not complete, set its focus.
                            sentence_focus(current_scene.sentences[i].sent_div);
                            break;
                        }
                    }
                }

            }

            //remove all events of the item that has been selected successfully.
            $(self).off();

        } else {
            //***TODO: Wrong selection make the word shake for a second, play the word that you clicked wrong.
            if (!is_audio_playing) {
                $(current_scene.sentences[sentence_idx].words[word_idx]).trigger("on_selected", { typ: "word", sentence: current_scene.sentences[sentence_idx], word_index: word_idx, correct: false });

                //if an audio file is not already playing.
                var div_word = build_scramble_word_html(self.getAttribute("data-word"), self.getAttribute('data-sen-id'));
                //make sure the new word is hidden.
                $(div_word).css('opacity', 0);

                //put copy overtop of existing word.
                //have to add it to the document first or offset will change the position to relative.
                _AM.html_container.appendChild(div_word);

                var off_set = $(self).offset();
                off_set.top -= $(div_word).height();
                //$(div_word).offset($(self).offset());
                $(div_word).offset({ top: off_set.top, left: off_set.left });

                var sentence_idx = parseInt(self.getAttribute('data-sen-id'));
                var word_idx = parseInt(self.getAttribute('data-word-idx'));
                
                //make the whole scramble sentence area fade to the background a little, to make the selected word stand out more, when its wrong.
                $('#story_div_sentence_' + sentence_idx).css('opacity', '0.1');
                

                //show copy of new word.
                $(div_word).children('div').attr('class', 'story_div_inner_word_scramble_wrong');
                $(div_word).css('opacity', 1);
                //hide the existing word - no colapse of sentence.
                $(self).children('div').css('opacity', 0);
               

                //construct file name to use.                
                var filename =  current_scene.sentences[sentence_idx].get_filename(word_idx);
                
                //add audio sub path.
                $(audio_streams[audio_stream_on_demand_word_idx]).off();
                $(audio_streams[audio_stream_on_demand_word_idx]).on("canplay", function (event) { is_audio_playing = 1; audio_streams[audio_stream_on_demand_word_idx][alb](); });

                $(audio_streams[audio_stream_on_demand_word_idx]).on("ended", function (event) { is_audio_playing = 0; $(div_word).children('div').css('opacity', 0); $('#story_div_sentence_' + sentence_idx).css('opacity', '1.0'); $(self).children('div').css('opacity', 1); $(div_word).remove(); });

                precache_audio(audio_streams[audio_stream_on_demand_word_idx], filename);
            }

        }
    }

    function build_scramble_word_html(word, sentence_id)
    {
        div_word = document.createElement('div');
        
        div_word.setAttribute('class', 'story_div_outter_word_abs');
        div_word.setAttribute('onselectstart', 'return false;');
        div_word.setAttribute('ondragstart', 'return false;');

        inner_word = document.createElement('div');        
        inner_word.setAttribute('class', 'story_div_inner_word_scramble');
        inner_word.innerHTML = word;

        div_word.appendChild(inner_word);

        return div_word;
    }

    function build_words_html(words, sentence_id, is_scramble, revealed_idx) {
        //split the sentence on spaces.        
        var words_html = [];        

        for (w = 0; w < words.length; w++) {
            div_word = document.createElement('div');

            div_word.setAttribute('id', 'div_outter_word_' + sentence_id + '_' + w);          
            div_word.setAttribute('class', 'story_div_outter_word');         
            div_word.setAttribute('data-sen-id', sentence_id);
            div_word.setAttribute('data-word-idx', w);
            div_word.setAttribute('data-word', words[w]);
            div_word.setAttribute('onselectstart', 'return false;');
            div_word.setAttribute('ondragstart', 'return false;');

            inner_word = document.createElement('div');
            inner_word.setAttribute('id', 'div_inner_word_' + sentence_id + '_' + w);

            if (_AM.scramble_mode && is_scramble) {
                //if scramble mode is turned on we only initially show the words that are in the scramble list.
                inner_word.setAttribute('class', 'story_div_inner_word_scramble');

                //attach functions to these words
                $(div_word).on("click", function (event) { event.stopPropagation(); var self = this; scramble_word_selected(self); });
                //$(div_word).on("touchend", function () { event.stopPropagation(); var self = this; scramble_word_selected(self); });

            } else if (_AM.scramble_mode && !is_scramble && w >= revealed_idx) {
                //scramble mode is on initially hide the words.
                inner_word.setAttribute('class', 'story_div_inner_word_notselected_hidden');

                $(div_word).on("click", function (event) {
                    var self = this;
                    //***TODO: verify this is working. make this sentence have focus.
                    sentence_focus(self);

                    word_selected(self);
                    event.stopPropagation();
                });

            } else {
                //regular show the words.
                inner_word.setAttribute('class', 'story_div_inner_word_notselected');

                //***TODO: bind events to play the word.
                $(div_word).on("click", function (event) {
                                                        var self = this;
                                                        sentence_focus(self);

                                                        word_selected(self);
                                                        event.stopPropagation();
                                                    });
                

            }

            inner_word.setAttribute('data-word', w);
            //inner_word.setAttribute('onselectstart', 'return false;');
            //inner_word.setAttribute('ondragstart', 'return false;');
            inner_word.innerHTML = words[w];

            div_word.appendChild(inner_word);

            //add div_word to the document.
            words_html.push(div_word);
        }

        if (!is_scramble)
        {
            speaker_img = document.createElement('img');
            speaker_img.setAttribute('id', 'story_div_sentence_button_img_speaker_' + sentence_id);
            speaker_img.setAttribute('src', _AM.image_path + 'speaker_icon_off.svg');
            speaker_img.setAttribute('class', 'story_div_sentence_button_img');
            speaker_img.setAttribute('data-sen-id', sentence_id);

            words_html.push(speaker_img);
        }

        if (_AM.scramble_mode && !is_scramble && revealed_idx < words.length) {
            //*** Adding if statement to only add select button if it is a choice sentence 04-18-14
            if (current_scene.sentences[sentence_id].can_select || current_scene.sentences[sentence_id].next_sentence_group) {
                select_img = document.createElement('img');
                select_img.setAttribute('id', 'story_div_sentence_button_img_select_' + sentence_id);
                select_img.setAttribute('src', _AM.image_path + 'sentence_icon_off.svg');
                //should be hidden until full sentence has been revealed.
                $(select_img).css('opacity', 0);

                select_img.setAttribute('class', 'story_div_sentence_button_img');
                select_img.setAttribute('data-sen-id', sentence_id);

                words_html.push(select_img);
            }
            //this.story_inner_button_img_select.addEventListener('click', story_sentence_selected, false);               
            //this.story_inner_button_img_select.addEventListener('touchend', story_sentence_selected, false);

        } else if (!is_scramble) {
            //*** Adding if statement to only add select button if it is a choice sentence 04-18-14
            if (current_scene.sentences[sentence_id].can_select || current_scene.sentences[sentence_id].next_sentence_group) {
                select_img = document.createElement('img');
                select_img.setAttribute('id', 'story_div_sentence_button_img_select_' + sentence_id);
                select_img.setAttribute('src', _AM.image_path + 'sentence_icon_off.svg');
                select_img.setAttribute('class', 'story_div_sentence_button_img');
                select_img.setAttribute('data-sen-id', sentence_id);

                words_html.push(select_img);
            }
        }        

        return words_html;
    }

    function update_svg_path_class(image, shape_class)
    {
        image.image_svg_path.setAttributeNodeNS(null, 'class', shape_class);
    }

    function add_words_to_display(sentence, all_complete)
    {
        //if ((_AM.scramble_mode) || (!_AM.scramble_mode && !sentence.is_scramble)) {
        if ((_AM.scramble_mode && (!sentence.is_scramble || (sentence.is_scramble && !all_complete))) || (!_AM.scramble_mode && !sentence.is_scramble)) {
            var sent_div = document.createElement('div');
            sent_div.setAttribute('id', 'story_div_sentence_' + sentence.sentence_id);
            sent_div.setAttribute('class', 'story_div_sentence_nofocus_fadein');
            sent_div.setAttribute('data-sen-id', sentence.sentence_id);

            sent_div.setAttribute('style', 'left:' + (video_offset.left + (sentence.x * video_intrinsic_scale)) + 'px; top:' + (video_offset.top + (sentence.y * video_intrinsic_scale)) + 'px; width:' + sentence.width * video_intrinsic_scale + 'px; color:' + sentence.font_color1);
            sent_div.setAttribute('onselectstart', 'return false;');
            sent_div.setAttribute('ondragstart', 'return false;');

            if (!sentence.is_scramble) {
                $(sent_div).on("click", function (event) { var self = this; sentence_focus(self); });
                //$(sent_div).on("touchend", function () { var self = this; sentence_focus(self); });
            }

            sentence.sent_div = sent_div;
          
            for (w = 0; w < sentence.words_html.length; w++) {
                //if (!sentence.is_scramble) {
                sent_div.appendChild(sentence.words_html[w]);
                //} else {
                //    _AM.html_container.appendChild(sentence.words_html[w]);
                //}
            }

            //if (!sentence.is_scramble) {
            _AM.html_container.appendChild(sent_div);
            //}
        }
    }

    function get_word_coords(title, idx)
    {
        var image = _AM.images[title];
        var l;
        var found=false;

        for (l = 0; l < image.sent.disp.length; l++) {
            if (idx >= image.sent.disp[l].length) {
                idx -= image.sent.disp[l].length;
            } else {
                found = true;
                break; //abort the for loop early.
            }
        }

        if (found) {
            var res = {};
            res.line = l;
            res.word_idx = idx;
            return res;
        } else {
            return null;
        }
    }

    function get_filename(title, word_coord)
    {
        var image = _AM.images[title];        

        var filename = image.sent.comp[word_coord.line][word_coord.word_idx]; //this.file_name_overrides[idx];

        if (!filename) {
            filename = image.sent.disp[word_coord.line][word_coord.word_idx] + '.mp3';
        } else {
            filename = filename + '.mp3';
        }

        return _AM.audio_path + (_AM.images[title].name_of_person || "narrator") + '/'  + filename;
    }

    function get_word_length(line_array)
    {
        var cnt = 0;
        for (var i = 0; i < line_array.length; i++) {
            cnt += line_array[i].length;
        }
        return cnt;
    }

    function play_next(title, to_word_idx) {
        requestAnimationFrame(
            function () {
                //debug_log('[sentence.play_next]: called by event ended on audio stream: ' + (audio_stream_idx % audio_stream_max) + ' for word number: ' + audio_stream_idx);

        //        if (audio_stream_idx < _AM.images[title].sent_revealed_idx) {
                    //$('#div_inner_word_' + current_scene.sentence_idx + '_' + audio_stream_idx).attr('class', 'story_div_inner_word_notselected');        
                var high_word = document.getElementById('svg_image_text_rect_' + title + '_' + audio_stream_idx);        
        //        } else {
                    //$('#div_inner_word_' + current_scene.sentence_idx + '_' + audio_stream_idx).attr('class', 'story_div_inner_word_notselected_hidden');
        //            document.getElementById('svg_image_text_rect_' + title + '_' + audio_stream_idx).setAttributeNS(null, 'class', 'story_svg_text_box_hidden');
        //        }

                if (high_word) {
                    high_word.setAttributeNS(null, 'class', _AM.images[title].animate_shape_class + '_text_box_hide');

                    if (audio_stream_idx < to_word_idx) {
                        //debug_log('[sentence.play_next]: detected that it needs to play next word');

                        //var self = this;
                        var prev_idx = audio_stream_idx;
                        audio_stream_idx++;

                        //debug_log('[sentence.play_next]: wiring up ended event on audio stream: ' + (audio_stream_idx % audio_stream_max));
                        //$(audio_streams[audio_stream_idx % audio_stream_max]).off("ended");
                        $(audio_streams[audio_stream_idx % audio_stream_max]).on("ended", { image_idx: title }, function (event) { play_next(event.data.image_idx, to_word_idx); $(this).off(event); });
                        $(audio_streams[audio_stream_idx % audio_stream_max]).on("stalled", { image_idx: title }, function (event) { play_next(event.data.image_idx, to_word_idx); $(this).off(event); });
                        $(audio_streams[audio_stream_idx % audio_stream_max]).on("error", { image_idx: title }, function (event) { play_next(event.data.image_idx, to_word_idx); $(this).off(event); });


                        //debug_log('[sentence.play_next]: initiating play on audio stream: ' + (audio_stream_idx % audio_stream_max) + ' for word number: ' + audio_stream_idx);

                        //***TO DO: check to see if i am at the start of a row that is not currently visible, if i am not make me visible by scrolling.
                        var word_coord = get_word_coords(title, audio_stream_idx + 1); //+1 causes scroll up on last word of line.
                        var text_group = document.getElementById('svg_image_text_group_' + title);
                        var scroll_idx = parseInt(text_group.getAttribute('data-scroll_idx'));

                        if (word_coord && scroll_idx + _AM.images[title].sent_display_lines - 1 < word_coord.line) {
                            scroll_text(title, 1);
                        }

                        setTimeout(function () { try_play_audio(title, to_word_idx) }, 100);

                        $(audio_streams[prev_idx % audio_stream_max]).off();
                        //if (prev_idx + audio_stream_max < get_word_length(_AM.images[title].sent.disp)) {
                        if (prev_idx + audio_stream_max < _AM.images[title].word_count) {
                            //invalidate the last precache
                            //debug_log('[sentence.play_next]: invalidating precache for audio_stream: ' + (prev_idx % audio_stream_max));
                            audio_streams[prev_idx % audio_stream_max].can_play = false;
                            audio_streams_is_precache[prev_idx % audio_stream_max] = false;

                            //debug_log('[sentence.play_next]: wiring up can_play event on audio_stream: ' + (prev_idx % audio_stream_max) + ' for word number: ' + (prev_idx + audio_stream_max));
                            $(audio_streams[prev_idx % audio_stream_max]).on("canplay",
                                       function (event) {
                                           //cache the next element along, if there is one.
                                           this.can_play = true;
                                       });

                            //debug_log('[sentence.play_next]: calling precache on audio_stream: ' + (prev_idx % audio_stream_max) + ' for word number: ' + (prev_idx + audio_stream_max));
                            audio_streams_is_precache[prev_idx % audio_stream_max] = true;
                            var word_coord = get_word_coords(title, prev_idx + audio_stream_max);
                            precache_audio(audio_streams[prev_idx % audio_stream_max], get_filename(title, word_coord));
                        }

                    } else {
                        //end of playing.
                        //debug_log('[sentence.play_next]: nothing more to play, setting is_audio_playing=false');                
                        is_audio_playing = 0;
                        //$('#div_inner_word_' + current_scene.sentence_idx + '_' + current_scene.current_sentence.revealed_idx).attr('class', 'story_div_inner_word_focus_hidden');
                        var reveal = document.getElementById('svg_image_text_rect_' + title + '_' + _AM.images[title].sent_revealed_idx);
                        if (reveal) {
                            reveal.setAttributeNS(null, 'class', _AM.images[title].animate_shape_class + '_text_box_show');
                        }

                        //$('#story_div_sentence_button_img_speaker_' + current_scene.sentence_idx).attr('src', _AM.image_path + 'speaker_icon_off.svg');
                        document.getElementById('svg_image_text_speaker_' + title).setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', getProtocol().protocol + _AM.image_path + _AM.images[title].animate_shape_class + "_speaker_icon_off.svg");

                    }
                } else {
                    //word disappeared off screen, end it.
                    is_audio_playing = 0;
                }

                //force block level change for some browsers to prioritize the change.
                //*********************************//
                document.getElementById('svg_image_' + title).style.display = 'none';
                document.getElementById('svg_image_' + title).offsetHeight;
                document.getElementById('svg_image_' + title).style.display = 'block';
            });
    }

    function play_text(title, from_word_idx, to_word_idx) {
        requestAnimationFrame(function () {

            //var self = this;
            //debug_log('[sentence.play]: called on sentence_idx:' + self.sentence_id + ' to play words from: ' + from_word_idx + ' to ' + to_word_idx);
            var len = _AM.images[title].word_count;// + 1; //get_word_length(_AM.images[title].sent.disp);

            if (!is_audio_playing && from_word_idx < len && to_word_idx < len) {
                is_audio_playing = 1;

                //turn on current speaker, if its available.                
                document.getElementById('svg_image_text_speaker_' + title).setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', getProtocol().protocol + _AM.image_path + _AM.images[title].animate_shape_class + "_speaker_icon_on.svg");
            
                if (_AM.scramble_mode) {
                    //un-highlight the next word you were supposed to be reading.

                    //*** temp comment out. - if (!current_scene.current_sentence.is_complete) {
                    //    $('#div_inner_word_' + current_scene.sentence_idx + '_' + current_scene.current_sentence.revealed_idx).attr('class', 'story_div_inner_word_notselected_hidden');
                    //}
                    var reveal = document.getElementById('svg_image_text_rect_' + title + '_' + _AM.images[title].sent_revealed_idx);
                    if (reveal) {
                        reveal.setAttributeNS(null, 'class', _AM.images[title].animate_shape_class + '_text_box_hide');
                    }
                }

                var max_buff;
                var off_set;

                //determine how far to go in buffering, if we can fill the buffer or are we short.
                if (from_word_idx + audio_stream_max - 1 < len) {
                    max_buff = from_word_idx + audio_stream_max - 1;
                } else {
                    max_buff = len - 1;
                }
                //debug_log('[sentence.play]: size of buffer to cache ' + (max_buff-from_word_idx) + ' of ' + audio_stream_max);

                if (!audio_streams_cache_invalidated && from_word_idx >= audio_stream_idx && from_word_idx < audio_stream_idx + audio_stream_max) {
                    //some must already be cached.
                    off_set = (audio_stream_idx + audio_stream_max) - from_word_idx - 1;
                    //debug_log('[sentence.play]: cache detected between ' + from_word_idx + ' to ' + (audio_stream_idx + audio_stream_max-1) + '. ' + off_set + ' cached words available');
                } else {
                    //no valid cache
                    //debug_log('[sentence.play]: no valid cache detected');
                    off_set = 0;

                    audio_streams_cache_invalidated = true;
                }

                audio_stream_idx = from_word_idx;

                for (i = from_word_idx; i < from_word_idx + audio_stream_max; i++) {

                    //clear off all current events from stream.
                    $(audio_streams[i % audio_stream_max]).off();

                    //add can play to audio that already has cache.
                    if (i < from_word_idx + off_set) {
                        //wire up can play
                        $(audio_streams[i % audio_stream_max]).on("canplay",
                        function (event) {
                            this.can_play = true;
                        });
                    }

                    //add events to all streams that need precaching.
                    if (i >= from_word_idx + off_set & i < max_buff) {
                        //debug_log('[sentence.play]: wiring up precache event on audio stream number: ' + (i % audio_stream_max) + ' for word number: ' + i);

                        //these need precache.
                        $(audio_streams[i % audio_stream_max]).on("canplay", { image_idx: title, idx: i },
                           function (event) {
                               //cache the next element along, if there is one.
                               this.can_play = true;
                               //if (event.data.idx <= event.data.play_to) {
                               //debug_log('[sentence.play]: precaching audio stream: ' + ((event.data.idx + 1) % audio_stream_max) + ' for word number: ' + (event.data.idx + 1));
                               audio_streams_is_precache[(event.data.idx + 1) % audio_stream_max] = true;
                               var word_coord = get_word_coords(event.data.image_idx, event.data.idx + 1);
                               precache_audio(audio_streams[(event.data.idx + 1) % audio_stream_max], get_filename(event.data.image_idx, word_coord));
                               //}
                               $(this).off(event);
                           
                               $(this).on("canplay", function (event) {
                                   this.can_play = true;
                               });
                           
                           });

                        $(audio_streams[i % audio_stream_max]).on("stalled", { image_idx: title, idx: i },
                           function (event) {
                               //cache the next element along, if there is one.
                               //this.can_play = true;
                               //if (event.data.idx <= event.data.play_to) {
                               //debug_log('[sentence.play]: precaching audio stream: ' + ((event.data.idx + 1) % audio_stream_max) + ' for word number: ' + (event.data.idx + 1));
                               audio_streams_is_precache[(event.data.idx + 1) % audio_stream_max] = true;
                               var word_coord = get_word_coords(event.data.image_idx, event.data.idx + 1);
                               precache_audio(audio_streams[(event.data.idx + 1) % audio_stream_max], get_filename(event.data.image_idx, word_coord));
                               //}
                               $(this).off(event);

                               $(this).on("canplay", function (event) {
                                   this.can_play = true;
                               });

                           });
                        $(audio_streams[i % audio_stream_max]).on("error", { image_idx: title, idx: i },
                           function (event) {
                               //cache the next element along, if there is one.
                               //this.can_play = true;
                               //if (event.data.idx <= event.data.play_to) {
                               //debug_log('[sentence.play]: precaching audio stream: ' + ((event.data.idx + 1) % audio_stream_max) + ' for word number: ' + (event.data.idx + 1));
                               audio_streams_is_precache[(event.data.idx + 1) % audio_stream_max] = true;
                               var word_coord = get_word_coords(event.data.image_idx, event.data.idx + 1);
                               precache_audio(audio_streams[(event.data.idx + 1) % audio_stream_max], get_filename(event.data.image_idx, word_coord));
                               //}
                               $(this).off(event);

                               $(this).on("canplay", function (event) {
                                   this.can_play = true;
                               });

                           });
                    } else if (i == max_buff) {
                        //only the last entry to wire up, it doesnt need to precache anything.
                        $(audio_streams[i % audio_stream_max]).on("canplay",
                                                function (event) {
                                                    this.can_play = true;
                                                });
                    }
                }

                if (audio_streams_cache_invalidated) {
                    audio_streams_cache_invalidated = false;
                    //now initiate precache on the first element because it is not cached
                    //debug_log('[sentence.play]: precaching audio stream: ' + (from_word_idx % audio_stream_max) + ' for word number: ' + from_word_idx);
                    //$(audio_streams[from_word_idx % audio_stream_max]).off();
                    audio_streams_is_precache[from_word_idx % audio_stream_max] = true;

                    $(audio_streams[from_word_idx % audio_stream_max]).on("canplay", function (event) {
                        //if (from_word_idx < _AM.images[image_id].sent_revealed_idx) {
                            //$('#div_inner_word_' + current_scene.sentence_idx + '_' + from_word_idx).attr('class', 'story_div_inner_word_selected');
                        document.getElementById('svg_image_text_rect_' + title + '_' + from_word_idx).setAttributeNS(null, 'class', _AM.images[title].animate_shape_class + '_text_box_show');
                        //} else {
                        //    document.getElementById('svg_image_text_rect_' + image_id + '_' + from_word_idx).setAttributeNS(null, 'class', 'story_svg_text_box_hidden_focus');
                       // }
                        audio_streams[from_word_idx % audio_stream_max][alb]();
                        $(this).off(event);

                        //force block level change for some browsers to prioritize the change.
                        //*********************************//
                        document.getElementById('svg_image_' + title).style.display = 'none';
                        document.getElementById('svg_image_' + title).offsetHeight;
                        document.getElementById('svg_image_' + title).style.display = 'block';
                    });
                    $(audio_streams[from_word_idx % audio_stream_max]).on("ended", function (event) { play_next(title, to_word_idx); $(this).off(event); });

                    /*$(audio_streams[from_word_idx % audio_stream_max]).on("stalled", function (event) {            
                        //TODO: TTS use text to speech synthesis.
                        play_next(title, to_word_idx);
                        $(this).off(event);
                    });*/
                    /*$(audio_streams[from_word_idx % audio_stream_max]).on("error", function (event) {
                        //is_audio_playing = 0;
                        play_next(title, to_word_idx);
                        $(this).off(event);
                        //TODO: TTS use text to speech synthesis.
                    });*/


                    var word_coord = get_word_coords(title, from_word_idx);
                    precache_audio(audio_streams[from_word_idx % audio_stream_max], get_filename(title, word_coord));
                } else {
                    //debug_log('[sentence.play]: audio stream already precached, playing: ' + (from_word_idx % audio_stream_max) + ' for word number: ' + from_word_idx);
                    //this element is already cached, play it.

                    //if (from_word_idx < _AM.images[title].sent_revealed_idx) {
                        //$('#div_inner_word_' + current_scene.sentence_idx + '_' + from_word_idx).attr('class', 'story_div_inner_word_selected');
                    document.getElementById('svg_image_text_rect_' + title + '_' + from_word_idx).setAttributeNS(null, 'class', _AM.images[title].animate_shape_class + '_text_box_show');
                    //} else {
                    //    document.getElementById('svg_image_text_rect_' + title + '_' + from_word_idx).setAttributeNS(null, 'class', 'story_svg_text_box_hidden_focus');
                    //}

                    var aud = audio_streams[from_word_idx % audio_stream_max]
                    $(aud).on("ended", function (event) { play_next(title, to_word_idx); $(this).off(event); });
                    $(aud).on("stalled", function (event) { play_next(title, to_word_idx); $(this).off(event); });
                    $(aud).on("error", function (event) { play_next(title, to_word_idx); $(this).off(event); });

                    $(aud).on("canplay", function (event) { aud[alb](); });

                    var word_coord = get_word_coords(title, from_word_idx + off_set);
                    precache_audio(audio_streams[(from_word_idx + off_set) % audio_stream_max], get_filename(title, word_coord));
                    //audio_streams[from_word_idx % audio_stream_max][alb]();

                }
            }

            //force block level change for some browsers to prioritize the change.
            //*********************************//
            document.getElementById('svg_image_' + title).style.display = 'none';
            document.getElementById('svg_image_' + title).offsetHeight;
            document.getElementById('svg_image_' + title).style.display = 'block';
        });
    }

    _AM.editor_scroll_text = function editor_scroll_text(title, dir) {
        scroll_text(title, dir);
    }

    //only supports -1 and 1 and 0 (to the start)
    function scroll_text(title, dir, jumpto)
    {
        //var title = parseInt(this.getAttribute('data-title')); 
        var text_group = document.getElementById('svg_image_text_group_' + title);
        if (text_group) {
            var scroll_idx = parseInt(text_group.getAttribute('data-scroll_idx'));
            var max_idx = parseInt(text_group.getAttribute('data-max_idx'));

            if (jumpto) {
                if (dir < 0) {
                    dir = 0;
                }
                if (dir > max_idx) {
                    dir = max_idx;
                }

                scroll_idx = dir;
            } else {
                if (dir == 0) {
                    scroll_idx = 0;
                }
                if (dir < 0 && scroll_idx > 0) {
                    scroll_idx += dir;
                }
                if (dir > 0 && scroll_idx < max_idx) { //***TODO: determine what 10 should really be.
                    scroll_idx += dir;
                }

                if (scroll_idx > max_idx) {
                    scroll_idx = max_idx;
                } else if (scroll_idx < 0) {
                    scroll_idx = 0;
                }
            }

            if (scroll_idx == 0) {
                var scroll_up = document.getElementById('svg_image_text_scrollup_' + title);
                //scroll_up.setAttributeNS(null, 'x', '-200');
                scroll_up.setAttributeNS(null, 'visibility', 'hidden');
            } else {
                var scroll_up = document.getElementById('svg_image_text_scrollup_' + title);
                //scroll_up.setAttributeNS(null, 'x', _AM.images[title].sent_clip_box[2]);
                scroll_up.setAttributeNS(null, 'visibility', 'visible');
            }

            if (scroll_idx == max_idx) {
                var scroll_down = document.getElementById('svg_image_text_scrolldown_' + title);
                scroll_down.setAttributeNS(null, 'visibility', 'hidden');
                //scroll_down.setAttributeNS(null, 'x', '-200');
            } else {
                var scroll_down = document.getElementById('svg_image_text_scrolldown_' + title);
                //scroll_down.setAttributeNS(null, 'x', _AM.images[title].sent_clip_box[2]);
                scroll_down.setAttributeNS(null, 'visibility', 'visible');
            }


            text_group.setAttributeNS(null, 'data-scroll_idx', scroll_idx);
            text_group.setAttributeNS(null, 'transform', 'translate(0, ' + -scroll_idx * (_AM.images[title].sent_height + 2 * _AM.scene_text_ver_spacing) + ')');
        }
    }

    _AM.editor_add_image_to_display = function editor_add_image_to_display(image, override_class) {
        add_image_to_display(image, override_class); 
    }

    function add_image_to_display(image, override_class) {
        if (override_class) {
            anim_shape_class = override_class;
        } else {
            anim_shape_class = image.animate_shape_class;
        }

        if (!_AM.scramble_mode) {
            image.sent_revealed_idx = Infinity;
        }

        image.image_svg_path = null;
        image.image_svg_img = null;
        image.image_svg_group = null;

        var svg_parent = null;        
        var fnd = false;
        var u = getProtocol();

        svg_parent = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        svg_parent.setAttributeNS(null, 'class', anim_shape_class + '_show');
        svg_parent.setAttributeNS(null, 'style', 'font-size:' + _AM.video_intrinsic_font_size + 'px;');
        if (image.sent) {
            //goes to end of svg dom so draws on top.
            _AM.svg_container.appendChild(svg_parent);
            fnd = true;
        } else if (image.image_src != null) {
            //find first none image src and add after it.
            //goes to front of dom so draws on bottom.
            //parentElement.insertBefore(newElement, parentElement.children[0]);
            _AM.svg_container.insertBefore(svg_parent, _AM.svg_container.childNodes[0]);
            fnd = true;
        } else {
            //assumes it is animate_shape only... and will be displayed above images, but below sentences.
            for (var i = 0; i < _AM.svg_container.childNodes.length; i++) {
                if (_AM.svg_container.childNodes[i].childNodes.length > -1 &&
                    (_AM.svg_container.childNodes[i].childNodes[0].nodeName.toLowerCase() == 'path' ||
                    _AM.svg_container.childNodes[i].childNodes[0].nodeName.toLowerCase() == 'clippath')) {
                    //found the place to insert.                    
                    _AM.svg_container.insertBefore(svg_parent, _AM.svg_container.childNodes[i]);
                    fnd = true;
                }                
            }

            if (!fnd) {
                //nothing found just append.
                _AM.svg_container.appendChild(svg_parent);
            }
        }
        
        image.image_svg_group = svg_parent;       

        if (image.image_src != null) {
            //start build image.
            var image_svg_img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            image_svg_img.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', u.protocol + _AM.image_path + image.image_src);
            image_svg_img.setAttributeNS(null, 'x', image.animate_shape[0].num[0]);
            image_svg_img.setAttributeNS(null, 'y', image.animate_shape[0].num[1]);
            image_svg_img.setAttributeNS(null, 'width', image.width);
            image_svg_img.setAttributeNS(null, 'height', image.height);

         
            image_svg_img.setAttributeNS(null, 'class', anim_shape_class + '_image');
           

            svg_parent.appendChild(image_svg_img);
            //update reference to image
            image.image_svg_img = image_svg_img;

            /*if (!image.animate_shape) {
                $(image_svg_img).on("click", { title: image.title }, function (event) { image_selected(event.data.title); });
            }*/
        }

        if (image.animate_shape) {               
                var svg_path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); //Create a path in SVG's namespace
                
                svg_path.setAttributeNS(null, 'd', convert_path_obj_to_d(image.animate_shape[0])); //Set path's data   
                svg_path.setAttributeNS(null, 'id', 'story_svg_' + image.title);
                svg_path.setAttributeNS(null, 'data-img_id', image.title);
               
                svg_path.setAttributeNS(null, 'class', anim_shape_class + '_path');                               

                svg_parent.appendChild(svg_path);
               
                image.image_svg_path = svg_path;

                if (!image.sent) {
                    $(image.image_svg_path).on("click", { title: image.title }, function (event) { image_focus(event.data.title); image_selected(event.data.title); });
                } else {
                    //if there is a text then this only can do focus, not a select.
                    if (!image.sent_is_scramble) { //only attach focus event to none scramble sentences.
                        $(image.image_svg_path).on("click", { title: image.title }, function (event) { image_focus(event.data.title); });
                    }
                }

        }

        if (image.sent) {
            /*
            <clipPath id="clip1">
                <rect x="200" y="10" width="60" height="100"/>
                ... you can have any shapes you want here ...
            </clipPath>

            <g clip-path="url(#clip1)">
                ... your text elements here ...
            </g>
            */
            var clip_path = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
            clip_path.setAttributeNS(null, 'id', 'svg_image_' + image.title);
            var clip_rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            clip_rect.setAttributeNS(null, 'id', 'svg_image_clip_rect_' + image.title);
            clip_rect.setAttributeNS(null, 'x', image.sent_clip_box[0]);
            clip_rect.setAttributeNS(null, 'y', image.sent_clip_box[1]);
            //need to make this get it from the curve.
            clip_rect.setAttributeNS(null, 'width', image.sent_clip_box[2] - image.sent_clip_box[0]);
            clip_rect.setAttributeNS(null, 'height', image.sent_clip_box[3] - image.sent_clip_box[1]);
            clip_path.appendChild(clip_rect);
            //_AM.svg_container.appendChild(clip_path);
            svg_parent.appendChild(clip_path);

            var clip_group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            clip_group.setAttributeNS(null, 'clip-path', 'url(#svg_image_' + image.title + ')');
            svg_parent.appendChild(clip_group);

            //transform applies to clip-path too... need to have an additional containing g element.... :|
            var text_group = document.createElementNS('http://www.w3.org/2000/svg', 'g');            
            text_group.setAttributeNS(null, 'style', 'font-size:' + _AM.video_intrinsic_font_size + 'px;');
            //text_group.setAttributeNS(null, 'clip-path', 'url(#svg_image_' + image.image_idx + ')');
            text_group.setAttributeNS(null, 'id', 'svg_image_text_group_' + image.title);
            text_group.setAttributeNS(null, 'data-scroll_idx', 0);
            text_group.setAttributeNS(null, 'data-max_idx', Math.max(image.sent.disp.length - image.sent_display_lines, 0));
            //text_group.setAttributeNS(null, 'transform', 'translate(0, -10)');
            //svg_parent.appendChild(text_group);
            clip_group.appendChild(text_group);

            var dx = _AM.scene_text_hor_spacing;
            var dy = _AM.scene_text_ver_spacing;
            var h = _AM.scene_text_ver_spacing * 2 + _AM.video_intrinsic_font_size;
            var cur_y;
            var cur_x;
            var max_x=0;

            var word_count = 0;
            //for each line of text.            
            var r = 0;
            for (r = 0; r < image.sent.disp.length; r++) {
                cur_x = image.sent_clip_box[0]; // animate_shape[0].num[0];
                cur_y = image.sent_clip_box[1] + ((r * 2) + 1) * dy + (r + 1) * h - image.sent_text_tale_height;

                var svg_text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                //text, x,y is bottom left as opposed to other objects that are top left.
                svg_text.setAttributeNS(null, 'id', 'svg_image_text_' + image.title + '_' + r);
                svg_text.setAttributeNS(null, 'x', cur_x);
                svg_text.setAttributeNS(null, 'y', cur_y);

                //svg_parent.appendChild(svg_text);
                text_group.appendChild(svg_text);

                //for each word in the line of text.                
                for (var w = 0; w < image.sent.disp[r].length; w++) {                    
                    var svg_text_span = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');

                    //set dx, dy for relative position of text.
                    var textNode = document.createTextNode(image.sent.disp[r][w]);
                    svg_text_span.appendChild(textNode);
                    svg_text.appendChild(svg_text_span);

                    //should now be able to get bounding box.
                    if (r == 0 && w == 0) {
                        var bb = svg_text.getBBox();
                        h = Math.ceil(bb.height);
                        image.sent_height = h;
                        image.sent_text_tale_height = Math.ceil((bb.y + bb.height) - cur_y);

                        //image.sent_top = Math.floor(bb.y);
                        //height was calculated incorrectly first time through.
                        cur_y = image.sent_clip_box[1] + ((r * 2) + 1) * dy + (r + 1) * h - image.sent_text_tale_height;
                        svg_text.setAttributeNS(null, 'y', cur_y);
                    }

                    svg_text_span.setAttributeNS(null, 'dx', 2*dx);
                    svg_text_span.setAttributeNS(null, 'id', 'svg_image_text_span_' + image.title + '_' + word_count);                    
                    svg_text_span.setAttributeNS(null, 'data_x', cur_x + 2*dx);
                    svg_text_span.setAttributeNS(null, 'data_y', cur_y);

                    if (word_count < image.sent_revealed_idx) {
                        svg_text_span.setAttributeNS(null, 'class', anim_shape_class + '_text_show');
                    } else {
                        svg_text_span.setAttributeNS(null, 'class', anim_shape_class + '_text_hide');
                    }

                    $(svg_text_span).on("click", { title: image.title, word_id: word_count }, function (event) {
                        console.log("svg_text_span_clicked.");
                        event.stopPropagation();
                        image_focus(event.data.title);
                        image_word_selected(event.data.title, event.data.word_id);
                        console.log("svg_text_span_clicked_complete.");
                    });

                    var wth = svg_text_span.getComputedTextLength() + 2*dx;

                    //now build rectangles.
                    var svg_rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    svg_rect.setAttributeNS(null, 'id', 'svg_image_text_rect_' + image.title + '_' + word_count);

                    svg_rect.setAttributeNS(null, 'x', cur_x + dx);
                    svg_rect.setAttributeNS(null, 'y', cur_y + image.sent_text_tale_height - image.sent_height - dy);
                    svg_rect.setAttributeNS(null, 'width', wth);
                    svg_rect.setAttributeNS(null, 'height', image.sent_height+dy);

                    $(svg_rect).on("click", { title: image.title, word_id: word_count }, function (event) {
                        console.log("svg_image_text_rect_clicked.");
                        event.stopPropagation();
                        image_focus(event.data.title);
                        image_word_selected(event.data.title, event.data.word_id);
                        console.log("svg_image_text_rect_clicked complete.");
                    });

                    if (word_count != image.sent_revealed_idx) {
                        svg_rect.setAttributeNS(null, 'class', anim_shape_class + '_text_box_hide');
                    } else {
                        svg_rect.setAttributeNS(null, 'class', anim_shape_class + '_text_box_show');
                    }
                    //parentElement.insertBefore(newElement, parentElement.children[0]);
                    //svg_parent.insertBefore(svg_rect, svg_text);
                    text_group.insertBefore(svg_rect, svg_text);

                    cur_x += wth;
                    word_count++;
                }

                if (cur_x > max_x) {
                    max_x = cur_x;
                }
            }

            //update the image clip box to be the size of the longest sentence.
            image.sent_clip_box[2] = max_x + h * 1.2;
            //now update the real clip box...
            clip_rect.setAttributeNS(null, 'width', image.sent_clip_box[2] - image.sent_clip_box[0]);                            
            image.sent_clip_box[3] = image.sent_clip_box[1] + image.sent_display_lines * image.sent_height;
            clip_rect.setAttributeNS(null, 'height', image.sent_clip_box[3] - image.sent_clip_box[1]);
            

            image.word_count = word_count;
            if (!_AM.scramble_mode) {
                image.sent_revealed_idx = image.word_count;
            }

            //add buttons for scrolling, selection and hearing.
            if (!image.sent_is_scramble) {
                //add buttons for selection, playback and listening.
                
                var image_svg_speaker = document.createElementNS('http://www.w3.org/2000/svg', 'image');
                image_svg_speaker.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', u.protocol + _AM.image_path + image.animate_shape_class + "_speaker_icon_off.svg");
                image_svg_speaker.setAttributeNS(null, 'id', 'svg_image_text_speaker_' + image.title);

                image_svg_speaker.setAttributeNS(null, 'x', image.sent_clip_box[2] - h * 1.2);
                image_svg_speaker.setAttributeNS(null, 'y', image.sent_clip_box[1]);
                image_svg_speaker.setAttributeNS(null, 'width', h * 1.2);
                image_svg_speaker.setAttributeNS(null, 'height', h * 1.2);
                image_svg_speaker.setAttributeNS(null, 'class', anim_shape_class + '_image');

                svg_parent.appendChild(image_svg_speaker);

                $(image_svg_speaker).on("click", { title: image.title }, function (event) {                    
                    event.stopPropagation();
                    requestAnimationFrame(function () {
                        //var sent = current_scene.sentences[event.data.title];
                        //sentence_focus(sent.sent_div);
                        image_focus(event.data.title);

                        /*var text_group = document.getElementById('svg_image_text_group_' + event.data.title);
                        text_group.setAttributeNS(null, 'data-scroll_idx', 0);
                        var max_idx = text_group.getAttributeNS(null, 'data-max_idx');
                        text_group.setAttributeNS(null, 'transform', 'translate(0, 0)');
    
    
                        var scroll_up = document.getElementById('svg_image_text_scrollup_' + event.data.title);
                        scroll_up.setAttributeNS(null, 'visibility', 'hidden');
    
                        if (max_idx == 0) {
                            var scroll_down = document.getElementById('svg_image_text_scrolldown_' + event.data.title);
                            scroll_down.setAttributeNS(null, 'visibility', 'hidden');
                            //scroll_down.setAttributeNS(null, 'x', '-200');
                        } else {
                            var scroll_down = document.getElementById('svg_image_text_scrolldown_' + event.data.title);
                            //scroll_down.setAttributeNS(null, 'x', _AM.images[title].sent_clip_box[2]);
                            scroll_down.setAttributeNS(null, 'visibility', 'visible');
                        }*/
                        scroll_text(event.data.title, 0);
                    });

                    //play_text(event.data.title, 0, get_word_length(_AM.images[event.data.title].sent.disp) - 1);
                    play_text(event.data.title, 0, _AM.images[event.data.title].word_count - 1);
                });
               

                //add the select item only if it can be selected or there is a next_image_group.
                if (image.sent_can_select || image.next_image_group) {
                    var image_svg_select = document.createElementNS('http://www.w3.org/2000/svg', 'image');
                    image_svg_select.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', u.protocol + _AM.image_path + image.animate_shape_class + "_sentence_icon_off.svg");
                    image_svg_select.setAttributeNS(null, 'id', 'svg_image_text_select_' + image.title);
                    image_svg_select.setAttributeNS(null, 'x', image.sent_clip_box[2] - h);


                    if (r < image.sent_display_lines)
                    {
                        cur_y = image.sent_clip_box[1] + (((image.sent_display_lines-1) * 2) + 1) * dy + ((image.sent_display_lines-1) + 1) * h - image.sent_text_tale_height;
                    }

                    image_svg_select.setAttributeNS(null, 'y', cur_y - (h - image.sent_text_tale_height)); //-h+(h-_AM.video_intrinsic_font_size)
                    image_svg_select.setAttributeNS(null, 'width', h);
                    image_svg_select.setAttributeNS(null, 'height', h);

                    if (image.sent_revealed_idx >= image.word_count && (_AM.scramble_mode || _AM.none_mode)) {                        
                        image_svg_select.setAttributeNS(null, 'class', anim_shape_class + '_image_show');                        
                    } else {
                        image_svg_select.setAttributeNS(null, 'class', anim_shape_class + '_image_hide');
                    }

                    $(image_svg_select).on("click", { title: image.title }, function (event) {
                        event.stopPropagation();              
                        document.getElementById('svg_image_text_select_' + event.data.title).setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', getProtocol().protocol + _AM.image_path + _AM.images[event.data.title].animate_shape_class + "_sentence_icon_on.svg");
                        image_focus(event.data.title);
                        image_selected(event.data.title);                      
                    });
                    //$(current_scene.sentences[s].words_html[current_scene.sentences[s].words_html.length - 1]).on("click", { ss: s }, function (event) { event.stopPropagation(); var sent = current_scene.sentences[event.data.ss]; sentence_focus(sent.sent_div); self = this; sentence_selected(self);  });
                    //function (event) { sent = current_scene.sentences[event.data.ii]; event.stopPropagation(); self = this; sentence_focus(self); sentence_selected(self); }

                    text_group.appendChild(image_svg_select);
                }
                //svg_parent.appendChild(image_svg_select);
            }

            

            var image_svg_scroll_up = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            image_svg_scroll_up.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', u.protocol + _AM.image_path + image.animate_shape_class + "_scroll_up.svg");
            image_svg_scroll_up.setAttributeNS(null, 'id', 'svg_image_text_scrollup_' + image.title);
            image_svg_scroll_up.setAttributeNS(null, 'title', image.title);
            image_svg_scroll_up.setAttributeNS(null, 'x', image.sent_clip_box[0]-h);
            image_svg_scroll_up.setAttributeNS(null, 'y', image.sent_clip_box[1]);
            image_svg_scroll_up.setAttributeNS(null, 'width', h);
            image_svg_scroll_up.setAttributeNS(null, 'height', h);
            //image_svg_scroll_up.setAttributeNS(null, 'transform', 'rotate(-90, 10, 10)');
            image_svg_scroll_up.setAttributeNS(null, 'class', anim_shape_class + '_image');
            image_svg_scroll_up.setAttributeNS(null, 'visibility', 'hidden');

            svg_parent.appendChild(image_svg_scroll_up);
            $(image_svg_scroll_up).on('click', { title: image.title }, function (event) { scroll_text(event.data.title, -1); image_focus(event.data.title); });


            var image_svg_scroll_down = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            image_svg_scroll_down.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', u.protocol + _AM.image_path + image.animate_shape_class + "_scroll_down.svg");
            image_svg_scroll_down.setAttributeNS(null, 'id', 'svg_image_text_scrolldown_' + image.title);
            image_svg_scroll_down.setAttributeNS(null, 'title', image.title);
            image_svg_scroll_down.setAttributeNS(null, 'x', image.sent_clip_box[0]-h);
            image_svg_scroll_down.setAttributeNS(null, 'y', image.sent_clip_box[3] -h); //-h+(h-_AM.video_intrinsic_font_size)
            image_svg_scroll_down.setAttributeNS(null, 'width', h);
            image_svg_scroll_down.setAttributeNS(null, 'height', h);
            //image_svg_scroll_up.setAttributeNS(null, 'transform', 'rotate(-90, 10, 10)');
            image_svg_scroll_down.setAttributeNS(null, 'class', anim_shape_class + '_image');
            if (image.sent.disp.length - image.sent_display_lines <= 0) {
                image_svg_scroll_down.setAttributeNS(null, 'visibility', 'hidden');
            } else
            {
                image_svg_scroll_down.setAttributeNS(null, 'visibility', 'visible');
            }

            svg_parent.appendChild(image_svg_scroll_down);
            $(image_svg_scroll_down).on('click', { title: image.title }, function (event) { scroll_text(event.data.title, 1); image_focus(event.data.title); });

        }
    }

    //TESTED SUCCESS
    //var __debug = 1;    
    
    //*** PUBLIC PROPERTIES ***//
    //_AM.prop1 = 2; //place holder property delete later.

    //used by splice_audio. - should be private properties.
    //*_vol_graph format = [[t1,v1],[t2,v2],[t3,v3]]; where t is the start time and v is the volume, linear approximation is made between the specified points.
    //TESTED SUCCESS/    
    //_AM.inc_vol_graph = increase_vol_graph = [[0.0, 0.0], [2.0, 1.0]];
    //_AM.dec_vol_graph = decrease_vol_graph = [[0.0, 1.0], [2.0, 0.0]];

  //turn off video volume for debugging.
    //_AM.inc_vol_graph = increase_vol_graph = [[0.0, 0.0], [2.0, 0.0]];
    //_AM.dec_vol_graph = decrease_vol_graph = [[0.0, 0.0], [2.0, 0.0]];

    //*** PUBLIC FUNCTIONS ***//
    //added new here.
    var video_intrinsic_width; //in pixels.
    var video_intrinsic_height;
    _AM.video_intrinsic_font_size;
    var video_intrinsic_scale; //in pixels - calculated.

    _AM.get_scale = function get_scale()
    {
        return video_intrinsic_scale;
    }

    _AM.html_container;
    _AM.svg_container;

    _AM.first_scene_name;

    //var div_video_size;
    _AM.init_defaults = function init_defaults(width, height, font_size, first_scene_name)
    {
        _AM.first_scene_name = first_scene_name;

        var is_chrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
        
        if (is_chrome) {
            if (window.location.protocol === "file:") {
                _AM.init_story(width, height, font_size, document.getElementById("story"), "www/image/", "www/audio/", "www/video1/", "www/video1/", "www/iframe/");
            } else {
                //chrome has problem with 2 videos having the same source while buffering...
                _AM.init_story(width, height, font_size, document.getElementById("story"), "www/image/", "www/audio/", "www/video1/", "www/video2/", "www/iframe/");
            }
        } else {
            _AM.init_story(width, height, font_size, document.getElementById("story"), "www/image/", "www/audio/", "www/video1/", "www/video1/", "www/iframe/");
        }        
    }

    _AM.init_story = function init_story(story_width, story_height, font_size, html_container, image_src, audio_src, video_src_1, video_src_2, iframe_src) {
        _AM.scene_paused = 0;

        _AM.image_path = image_src;
        _AM.audio_path = audio_src;
        _AM.video_path_1 = video_src_1;
        _AM.video_path_2 = video_src_2;
        _AM.iframe_path = iframe_src;

        _AM.html_container = html_container;
        //_AM.svg_container = svg_container;

        video_intrinsic_width = story_width;
        video_intrinsic_height = story_height;
        _AM.video_intrinsic_font_size = font_size;

        //svg_container.setAttributeNS(null, 'viewBox', '0 0 ' + story_width + ' ' + story_height);

        //add the div to the main body.
        /*div_video_size = document.createElement('div');
        div_video_size.setAttribute('id', 'video_size');
        div_video_size.setAttribute('class', 'background_div_video_size');
        document.body.appendChild(div_video_size);*/
        
        _AM.story_resize(); //***TO DO: maybe need a delay on this???

        _AM.scenes[0] = {};
        _AM.scenes[1] = {};
        cache_scene_idx = 0;

        $(window).off("resize", _AM.story_resize);
        $(window).on("resize", _AM.story_resize);

        $(window).off("message onmessage", _AM.proc_message);
        $(window).on("message onmessage", _AM.proc_message);

        //disable context menu for right click as it gets in the way of the game if a younger person accidently right clicks.
        $(document).on("contextmenu", function(e) {
            return false;
        });
    }

    function node(value, predecessors, row, col) {
        this.value = value;
        this.predecessors = predecessors;
        this.row = row;
        this.col = col;
    }

    //predecessor selection does not work.   
    function all_predecessor_paths(r, c) {
        var predecessors = [];
        for (var i = 0; i < search_results.length; i++) {
            if (search_results[i].col < c && search_results[i].row < r) {
                predecessors.push(search_results[i]);
            }
        }

        return predecessors;
    }

    //function test match incase, testing gets more complicated.
    //should strip grammar
    function test_match(x, y) {        
        if (x.toLowerCase() == y.toLowerCase()) {
            return true;
        } else {
            return false;
        }        
    }

    function test_best_node_path(best_path, test_path)
    {
        if (test_path.depth > best_path.depth) {
            return true;
        } else if (test_path.depth == best_path.depth) {
            //perform additional testing.
            var count_test = 0;
            var count_best = 0;
            for (var i = 0; i < test_path.nodes.length; i++) {
                count_test += test_path.nodes[i].value.length;
                count_best += best_path.nodes[i].value.length;
            }

            if (count_test > count_best) {
                return true;
            }
        }

        return false;
    }

    function check_depth(cur_node, dp) {
        //if this predecessor has more before it keep going.
        var best_path = { nodes: [], depth: -1 };
        var test_path = {};

        if (cur_node.predecessors.length > 0) {
            dp++;
            for (var i = 0; i < cur_node.predecessors.length; i++) {
                test_path = check_depth(cur_node.predecessors[i], dp);
                if (test_best_node_path(best_path, test_path))
                {
                    //the test path is better than the current best_path.
                    best_path = test_path;                   
                }
            }           
            
            best_path.nodes.push(cur_node);
            best_path.depth++;
            return best_path;
        } else {
            best_path.nodes.push(cur_node);
            best_path.depth = 0;
            return best_path;
        }
    }

    var search_results = []; //temp array of node search_results - if it was possible to run search concurrently this would be a problem that would require fixing.
    _AM.search = function search(as1, as2, offset) {
        search_results = [];
        for (var r = offset; r < as2.length; r++) {
            for (var c = 0; c < as1.length; c++) {
                if (test_match(as1[c], as2[r])) {
                    var n = new node(as2[r], all_predecessor_paths(r, c), r, c);
                    search_results.push(n);
                }
            }
        }

        //we now have matches... but we are interested in the longest path, so build the paths and find which is longest.
        var best_path = { nodes: [], depth: -1 };
        var test_path = {};
        for (var i = 0; i < search_results.length; i++)
        {
            test_path = check_depth(search_results[i], 0);
            if (test_best_node_path(best_path, test_path)) {
                //the test path is better than the current best_path.
                best_path = test_path;
            }            
        }
        //max_path.value = max_path.value.reverse();
        return best_path;
    }    

    
    _AM.proc_message = function proc_message(e) {
        //process incomming message.
        var data = e.originalEvent.data;

        //check for speech data.
        switch(data.substring(0, 3))        
        {
           case "sp_":
                //speech message data                                
                var speechResult = JSON.parse(data.substring(3));                
                
                if (speechResult.stopped) {
                    //mic informed us it stopped, save where we are at.
                    //process_input_best_match(_AM.speech_result, true);
                    command_bar_input_change(null, true, true);
                    
                    //restart mic.
                    var iframe = document.getElementById('story_command_iframe');
                    iframe.contentWindow.postMessage('sp_restart', '*');
                }else {
                    _AM.speech_result = [];
                    _AM.speech_interim = '';
                    var l = 0;
                    // was var i = _AM.speechResult.resultIndex, but as i build interim_transcript from scratch each time....
                    for (var i = 0; i < speechResult.results.length; i++) {
                        l = speechResult.results[i].length;
                        if (l > 1) {
                            _AM.speech_interim += '[';
                            for (var a = 0; a < l; a++) {
                                _AM.speech_result = _AM.speech_result.concat(speechResult.results[i][a].transcript.trim().split(' '));
                                _AM.speech_interim += speechResult.results[i][a].transcript;
                                if (a != l) {
                                    _AM.speech_interim += ',';
                                }
                            }
                            _AM.speech_interim += ']';
                        } else {
                            _AM.speech_result = _AM.speech_result.concat(speechResult.results[i][0].transcript.split(' '));
                            _AM.speech_interim += speechResult.results[i][0].transcript;
                        }
                    }

                    $('#story_command_input').focus().val(_AM.speech_interim);
                    //manually call the command bar input change event.
                    command_bar_input_change(null, true);
                }
                //alert(speechResult[0][0].transcript);
                break;
            case "if_":
                //iframe message data.
                parameters = data.substring(3).split(' ');
                var id;
                var func;
                var scene_title;

                //go through all the parameters.
                for (i = 0; i < parameters.length; i++) {
                    keypair = parameters[i].split(':');

                    switch (keypair[0]) {
                        case "id":
                            id = keypair[1];
                            break;
                        case "scene_title":
                            scene_title = keypair[1];
                            break;
                        case "change_scene":
                            func = "change_scene";
                            break;
                        case "cut_scene":
                            func = "cut_scene";
                            break;
                        case "continue":
                            func = "continue";
                            break;

                        default:
                            //don't know the parameter... ignore it.
                            break;
                    }

                }

                //this is seperated from the switch incase the id is not sent in as the first parameter.
                if (func == "change_scene") {
                    $(current_scene.iframes[id]).trigger("on_hide", { typ: "iframe", iframe: current_scene.iframes[id] });
                    _AM.change_scene(scene_title);
                    $("#story_iframe_").fadeOut("fast", function () { $(this).remove(); });

                } else if (func == "cut_scene") {
                    $(current_scene.iframes[id]).trigger("on_hide", { typ: "iframe", iframe: current_scene.iframes[id] });
                    _AM.cut_scene(scene_title);
                    $("#story_iframe_").fadeOut("fast", function () { $(this).remove(); });

                } else if (func == "continue") {
                    $(current_scene.iframes[id]).trigger("on_hide", { typ: "iframe", iframe: current_scene.iframes[id] });
                    _AM.continue_scene();
                    $("#" + id).fadeOut("fast", function () { $(this).remove(); });

                }
                break;

            default:
                break;
        }
        
            
        
    }

    _AM.story_resize = function story_resize() {
        //video_intrinsic_scale = $('#video_size').width() / video_intrinsic_width;
        //_AM.html_container.setAttribute('style', 'font-size:' + Math.floor(_AM.video_intrinsic_font_size * video_intrinsic_scale) + 'px;');

        _AM.resize();
    }
    //end added new here.

    //needs to be wired up to resize the window, and manually called when the scene is first ready.
    //DO NOT CALL BEFORE AN INIT FUNCTION CALL HAS BEEN MADE FIRST - IT DOES NOT CHECK.
    //this resizes the font sizes as video scales, browser is left to handle video resize.
    var resize_iframe_timer = null;

    _AM.resize = function resize()
    {
        var video_font_size;
        if('_AMI' in window){
          video_font_size = _AMI.catalog.fontSize;
        }else{
          video_font_size = _AME.catalog.fontSize;
        }
        //video_intrinsic_scale = $(_AM.video_streams[video_stream_idx]).width() / video_intrinsic_width;
        //_AM.html_container.setAttribute('style', 'font-size:' + _AM.video_intrinsic_font_size * video_intrinsic_scale + 'px;');
        video_intrinsic_scale = $('#video_size').width() / video_intrinsic_width;
        //.setAttribute('style', 'font-size:' + Math.floor(_AM.catalog.fontSize * get_scale()) + 'px;');
        
        if (_AM.video_streams[video_stream_idx]) {
            video_offset = $(_AM.video_streams[video_stream_idx]).offset();

            //see if the command_bar is created yet.
            if (_AM.command_bar) {
                document.getElementById('story_command_bar').setAttribute('style', 'display:block !important; left:' + Math.floor(video_offset.left + Math.floor((3.0 * _AM.get_scale()) / 2.0)) + 'px; top:' + Math.floor(video_offset.top + $(_AM.video_streams[video_stream_idx]).height() + Math.floor((3.0 * _AM.get_scale()) / 2.0)) + 'px; width:' + Math.floor($(_AM.video_streams[video_stream_idx]).width() - Math.floor((3.0 * _AM.get_scale()) * 2.0)) + 'px; border-width:' + Math.floor(3.0 * _AM.get_scale()) + 'px; height:' + Math.floor((video_font_size + 4.0) * _AM.get_scale()) + 'px;');
                document.getElementById('story_command_input').setAttribute('style', 'font-size:' + Math.floor(video_font_size * _AM.get_scale()) + 'px; height:' + (Math.floor((video_font_size + 3.0) * _AM.get_scale())) + 'px; width:' + ($(_AM.video_streams[video_stream_idx]).width() - Math.floor(video_font_size * _AM.get_scale()) - Math.floor((5.0 * _AM.get_scale()) * 2.0)) + 'px;');
                document.getElementById('story_command_iframe').setAttribute('width', (Math.floor((video_font_size+3.0) * _AM.get_scale())));
                document.getElementById('story_command_iframe').setAttribute('height', (Math.floor((video_font_size+3.0) * _AM.get_scale())));
                //document.getElementById('story_command_iframe').setAttribute('src', '');

                //clearTimeout(resize_iframe_timer);
                //resize_iframe_timer = setTimeout(function () { document.getElementById('story_command_iframe').setAttribute('src', 'speech.html'); }, 1000);
            }

            if (current_scene) {
                //_AM.svg_container.setAttributeNS(null, 'transform', 'scale(' + video_intrinsic_scale + ')');
                //_AM.svg_container.setAttributeNS(null, 'viewBox', '0 0 854, 480');

                //go through all sentences and reposition.         
                /*for (i = 0; i < current_scene.sentences.length; i++) {
                    //sen = story_sentences[keys[i]];
                    if (current_scene.sentences[i].sent_div) {
                        current_scene.sentences[i].sent_div.setAttribute('style', 'left:' + (video_offset.left + (current_scene.sentences[i].x * video_intrinsic_scale)) + 'px; top:' + (video_offset.top + (current_scene.sentences[i].y * video_intrinsic_scale)) + 'px; width:' + Math.ceil(current_scene.sentences[i].width * video_intrinsic_scale) + 'px;' + "opacity:" + $(current_scene.sentences[i].sent_div).css("opacity"));
                    }
                }*/
                var test_image;
                //for (i = 0; i < current_scene.images.length; i++) {
                for (var key in _AM.images) {
                    if (_AM.images.hasOwnProperty(key)) {
                        test_image = _AM.images[key];

                        if (test_image.image_svg_group) {                            

                            //csi.image_div.setAttribute('style', 'left:' + (video_offset.left + (csi.x * video_intrinsic_scale)) + 'px; top:' + (video_offset.top + (csi.y * video_intrinsic_scale)) + 'px; opacity:' + $(csi.image_div).css("opacity"));

                            //if (csi.image_src != "") {
                            //    csi.image_img.setAttribute('style', 'width:' + (csi.width * video_intrinsic_scale).toFixed(0) + 'px; height:' + (csi.height * video_intrinsic_scale).toFixed(0) + "px;");
                            //}

                            //if (csi.animate_path) {
                            //csi.image_svg.setAttributeNS(null, 'width', (csi.width * video_intrinsic_scale).toFixed(0));
                            //csi.image_svg.setAttributeNS(null, 'height', (csi.height * video_intrinsic_scale).toFixed(0));
                            //}

                            if (test_image.triggered) {
                                if (test_image.is_animating) {
                                    animate_image_helper(test_image);
                                }
                            }

                          }
                    }
                }

                if (current_scene.iframes) {
                    for (i = 0; i < current_scene.iframes.length; i++) {
                        //sen = story_sentences[keys[i]];
                        if (current_scene.iframes[i].html_iframe) {
                            current_scene.iframes[i].html_iframe.setAttribute('style', 'left:' + video_offset.left + 'px; top:' + video_offset.top + 'px;');
                        }
                    }
                }

            }
        }
    }


    //*** TESTING PRIVATE FUNCTIONS - SHOULD BE COMMENTED OUT AT PRODUCTION ***/
    //_AM.sync_video_to_video = sync_video_to_video;
    //_AM.splice_audio = splice_audio;


    //*** PRIVATE FUNCTIONS ***//

    //all debug lines should be removed at production.
    function debug_log(m) {
        if (__debug) {
            //console.log(m);
        }
    }

    //private function should be called once by jquery when page has loaded.
    //Sets the fixed width and height the movie files are stored in using pixels as units and the max number of parrallel video streams.
    _AM.init = function init() {

        /*
        _AM.image_path = image_src;
        _AM.audio_path = audio_src;
        _AM.video_path_1 = video_src_1;
        _AM.video_path_2 = video_src_2;

        _AM.html_container = html_container;
        video_intrinsic_width = story_width;
        video_intrinsic_height = story_height;
        _AM.video_intrinsic_font_size = font_size;
        */

        //initalize the save data object.
        /*if (!_AM.save_data.auto_restore) {
            _AM.init_save_data();
        }*/
        _AM.svg_container = add_svg_element('background_div_video_size');
        //create two video streams, one acts as current the other acts as a shadow buffer when seeking video or changing scenes;
        _AM.video_streams[0] = add_video_element('background_div_video_size');
        $(_AM.video_streams[0]).attr("class", "story_video_player_hide");
        _AM.video_streams[1] = add_video_element('background_div_video_size');
        $(_AM.video_streams[1]).attr("class", "story_video_player_hide");

        _AM.command_bar = add_command_bar('background_div_command_size');

        //create two audio streams, one acts as the current word player the other acts as a shadow buffer for changing words quickly;
        for (i = 0; i < audio_stream_max; i++) {
            audio_streams[i] = add_audio_element();
        }

        for (i = 0; i < audio_effect_max; i++) {
            audio_effects[i] = add_audio_element();
        }

        //create two more audio streams, one for reading the whole sentence and one for read word on demand.
        audio_streams[audio_stream_max] = add_audio_element();
        audio_streams[audio_stream_max + 1] = add_audio_element();

        //***TO DO: remove the following.
        /*_AM.video_streams = _AM.video_streams;
        _AM.audio_streams = audio_streams;*/
    }

    _AM.editor_init = function editor_init() {

        /*
        _AM.image_path = image_src;
        _AM.audio_path = audio_src;
        _AM.video_path_1 = video_src_1;
        _AM.video_path_2 = video_src_2;

        _AM.html_container = html_container;
        video_intrinsic_width = story_width;
        video_intrinsic_height = story_height;
        _AM.video_intrinsic_font_size = font_size;
        */

        //initalize the save data object.
        /*if (!_AM.save_data.auto_restore) {
            _AM.init_save_data();
        }*/
        _AM.svg_container = add_svg_element('background_div_video_editor_size');

        //create two video streams, one acts as current the other acts as a shadow buffer when seeking video or changing scenes;
        _AM.video_streams[0] = add_video_element('background_div_video_editor_size');
        $(_AM.video_streams[0]).attr("class", "story_video_editor_show");
        _AM.video_streams[1] = add_video_element('background_div_video_editor_size');
        $(_AM.video_streams[1]).attr("class", "story_video_editor_fade_hide");

        //create two audio streams, one acts as the current word player the other acts as a shadow buffer for changing words quickly;
        for (i = 0; i < audio_stream_max; i++) {
            audio_streams[i] = add_audio_element();
        }

        for (i = 0; i < audio_effect_max; i++) {
            audio_effects[i] = add_audio_element();
        }

        //create two more audio streams, one for reading the whole sentence and one for read word on demand.
        audio_streams[audio_stream_max] = add_audio_element();
        audio_streams[audio_stream_max + 1] = add_audio_element();

        //***TO DO: remove the following.
        /*_AM.video_streams = _AM.video_streams;
        _AM.audio_streams = audio_streams;*/
        //_AM.editor_resize();
    }


    function ready_to_play()
    {
        //console.log("can_play: true")
        this.can_play = true;
    }

    function add_svg_element(div_style) {
        var d = document.createElement('div');
        d.setAttribute('class', div_style);
        var s=document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        s.setAttributeNS(null, 'id', 'story_svg');
        s.setAttributeNS(null, 'class', 'story_svg_canvas');
        //svg_container.setAttributeNS(null, 'viewBox', '0 0 ' + story_width + ' ' + story_height);
        s.setAttributeNS(null, 'viewBox', '0 0 ' + video_intrinsic_width + ' ' + video_intrinsic_height);
        d.appendChild(s);
        _AM.html_container.appendChild(d);
        return s;
        //<svg id="story_svg" xmlns="http://www.w3.org/2000/svg" class="story_svg_canvas" viewBox="0 0 0 0">
        //</svg>
    }

    /*function editor_add_svg_element(div_style) {
        var d = document.createElement('div');
        d.setAttribute('class', div_style);
        var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        s.setAttributeNS(null, 'id', 'story_svg');
        s.setAttributeNS(null, 'class', 'story_svg_canvas');
        //svg_container.setAttributeNS(null, 'viewBox', '0 0 ' + story_width + ' ' + story_height);
        s.setAttributeNS(null, 'viewBox', (-1.0 * _AM.editor_svg_margin) + ' ' + (-1.0 * _AM.editor_svg_margin) + ' ' + (video_intrinsic_width + _AM.editor_svg_margin) + ' ' + (video_intrinsic_height + _AM.editor_svg_margin));
        d.appendChild(s);
        _AM.html_container.appendChild(d);
        return s;
        //<svg id="story_svg" xmlns="http://www.w3.org/2000/svg" class="story_svg_canvas" viewBox="0 0 0 0">
        //</svg>
    }*/

    function add_video_element(div_style)
    {
        var d = document.createElement('div');
        d.setAttribute('class', div_style);
        var video_player = document.createElement('video');
        $(video_player).on("canplay", ready_to_play);
        //video_player[bz] = 0.0;        
        video_player.setAttribute('preload', 'auto');
        video_player.setAttribute('type', 'video/mp4');
        video_player.src = _AM.video_path_1 + 'black.mp4' //short empty video, to initiate play on to enable play pause search ability in some browsers        
        //video_player.setAttribute('class', 'story_video_player_hide');        
        d.appendChild(video_player);
        _AM.html_container.appendChild(d);
        video_player.load();
        return video_player;
    }

    function add_audio_element() {
        var audio_player = document.createElement('audio');
        $(audio_player).on("canplay", ready_to_play);
        //audio_player[bz] = 0.0;
        audio_player.setAttribute('preload', 'auto');
        audio_player.setAttribute('type', 'audio');
        audio_player.src = _AM.audio_path + 'narrator/'+ 'nosound.mp3' //short empty video, to initiate play on to enable play pause search ability in some browsers        
        //audio_player.setAttribute('class', 'story_audio_player_hide');
        

        _AM.html_container.appendChild(audio_player);
        audio_player.load();
        return audio_player;
    }

    function command_bar_clear_sent_input_idx()
    {
        //send message to iframe to stop running mic.
        var iframe = document.getElementById('story_command_iframe');
        iframe.contentWindow.postMessage('sp_stop', '*');

        var word;
        for (var key in _AM.images) {
            if (_AM.images.hasOwnProperty(key)) {
                test_image = _AM.images[key];
                test_image.sent_input_idx = 0;
                if (test_image.is_displayed && test_image.sent_can_select) {
                    //deselect all.
                    for (var i = test_image.sent_input_idx; i < test_image.sent_input.length; i++) {
                        word = document.getElementById('svg_image_text_rect_' + key + '_' + i)
                        if (word) {
                            word.setAttributeNS(null, 'class', test_image.animate_shape_class + '_text_box_hide');
                        }
                    }

                    scroll_text(key, 0, true);
                }                
                //test_image.sent.comp[line][word];
                //if (test_image.scene_title == current_scene.name) {
                //use this search function to get matches. _AM.search

                //highlight from last sent_input_idx up to current matches. when the input clears updates sent_index_idx up to the last match index.
            }
        }
    }

    function process_input_best_match(inp, update_sent_idx){
        //use to check all images. 
        var test_image;
        var test_count;
        var best_count;
        var best_match;
        var best_key;

        for (var key in _AM.images) {
            if (_AM.images.hasOwnProperty(key)) {
                test_image = _AM.images[key];
                if (test_image.is_displayed && test_image.sent_can_select) {
                    var match = _AM.search(inp, test_image.sent_input, test_image.sent_input_idx);
                    var match_idx = 0;

                    //deselect all.
                    for (var i = test_image.sent_input_idx; i < test_image.sent_input.length; i++) {                        
                        document.getElementById('svg_image_text_rect_' + key + '_' + i).setAttributeNS(null, 'class', test_image.animate_shape_class + '_text_box_hide');
                    }

                    //go through the sentence and change the ccs on the words that match.
                    test_count = 0;
                    if (match && match.depth != -1) {
                        //select the newly selected.
                        for (var i = 0; i < match.nodes.length; i++) {
                            document.getElementById('svg_image_text_rect_' + key + '_' + match.nodes[i].row).setAttributeNS(null, 'class', test_image.animate_shape_class + '_text_box_show_input');
                            test_count += match.nodes[i].value.length;
                            if (i == match.nodes.length - 1) {
                                //last node, see where it is in position.
                                var word_coord = get_word_coords(key, match.nodes[i].row);
                                scroll_text(key, word_coord.line - 1, true);

                                if (update_sent_idx) {
                                    test_image.sent_input_idx = match.nodes[i].row + 1;
                                }
                            }
                        }

                        //now determine best match and give the best match focus.
                        if (best_match) {
                            if (best_match.nodes.length < test_count.length) {
                                best_match = match;
                                best_count = test_count;
                                best_key = key;
                            }
                        } else {
                            best_match = match;
                            best_count = test_count;
                            best_key = key;
                        }

                        //then determine if best match is enough for select option.
                    }
                }
            }
        }

        //highlight best match.
        if (best_key) {
            image_focus(best_key);

            //determine if best_match matches enough to select it.
            if (_AM.images.hasOwnProperty(best_key)) {
                if (best_match.nodes.length / _AM.images[best_key].sent_input.length >= _AM.speech_match_threshold) {
                    //text selected.
                    //send message to iframe to stop running mic.
                    var iframe = document.getElementById('story_command_iframe');
                    iframe.contentWindow.postMessage('sp_stop', '*');

                    var image_svg_select = document.getElementById('svg_image_text_select_' + best_key)
                    image_svg_select.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', getProtocol().protocol + _AM.image_path + _AM.images[best_key].animate_shape_class + "_sentence_icon_on.svg");
                    image_svg_select.setAttributeNS(null, 'class', _AM.images[best_key].animate_shape_class + '_image_show');
                    image_selected(best_key);
                    //clearTimeout(reset_input_timer);
                }
            }
        }
           
        //return best_key;
    }       

    var input_timer;
    var reset_input_timer;
    function command_bar_input_change(e, is_speech, update_sent_idx) {
        //convert input bar into an array.
        clearTimeout(reset_input_timer);
        reset_input_timer = setTimeout(function () { command_bar_clear_sent_input_idx() }, 5000);

        if (e && e.keyCode == 13) {
            //enter key pressed.
            //finailize the word matches so far... clear input for more. set the sent_input_idx to processed so far in each sentence.
            if (_AM.type_mode || _AM.none_mode) {
                var inp = $('#story_command_input').val().trim().split(' ');
                process_input_best_match(inp, true);
                $('#story_command_input').val('');
                return false;
            }

            //still process commands no matter what game mode...
            if (current_scene.scene_comm_bar_func != null && current_scene.scene_comm_bar_func != '') {
                (new Function(current_scene.scene_comm_bar_func))();
                //current_scene.scene_comm_bar_func($('#story_command_input').val().trim());
            }
        } else if (e && e.keyCode == 32) {
            var inp = $('#story_command_input').val().trim().split(' ');

            if (_AM.type_mode || _AM.none_mode) {
                process_input_best_match(inp);
            }

            //still process commands no matter what game mode...
            if (current_scene.scene_comm_bar_func != null && current_scene.scene_comm_bar_func != '') {
                (new Function(current_scene.scene_comm_bar_func))();
                //current_scene.scene_comm_bar_func($('#story_command_input').val().trim());
            }
        } else if (is_speech) {
            //var inp = $('#story_command_input').val().trim().split(' ');                
            //turns out speechResult.results, each index on here is a fragment... might be more than 1 word... need to adjust that...
            if (_AM.read_mode || _AM.none_mode) {
                if (_AM.speech_result.length > 12) {
                    process_input_best_match(_AM.speech_result, true);
                } else {
                    process_input_best_match(_AM.speech_result, update_sent_idx);
                }
            }

            //still process commands no matter what game mode...
            if (current_scene.scene_comm_bar_func != null && current_scene.scene_comm_bar_func != '') {
                (new Function(current_scene.scene_comm_bar_func))();
                //current_scene.scene_comm_bar_func($('#story_command_input').val().trim());
            }
        }else {
            //.sent_input_idx this is the temp variable for how far is already read.            
            //give a relaxation timer for it to clear sent_input_idx if it has not matched it all yet for selection.
            clearTimeout(input_timer);
            input_timer = setTimeout(function () { var inp = $('#story_command_input').val().trim().split(' '); process_input_best_match(inp); }, 800);

            //still process commands no matter what game mode...
            if (current_scene.scene_comm_bar_func != null && current_scene.scene_comm_bar_func != '') {
                (new Function(current_scene.scene_comm_bar_func))();
                current_scene.scene_comm_bar_func($('#story_command_input').val().trim());
            }
        }
    }

    function add_command_bar(div_style) {
        var com_bar = document.createElement('div');
        com_bar.setAttribute('id', 'story_command_bar');
        com_bar.setAttribute('class', div_style);
        var tbComm = document.createElement('input');
        tbComm.setAttribute('id', 'story_command_input');        
        com_bar.appendChild(tbComm);
        $(tbComm).on('keyup paste', command_bar_input_change);
        var iSpeech = document.createElement('iframe');
        iSpeech.setAttribute('id', 'story_command_iframe');
        iSpeech.setAttribute('seamless', 'seamless');
        iSpeech.setAttribute('frameBorder', '0');
        //iSpeech.setAttribute('class', div_style);
        iSpeech.setAttribute('src', 'https://adventuremashup.com/speech.html');
        com_bar.appendChild(iSpeech);
        _AM.html_container.appendChild(com_bar);

        return com_bar;
    }

    /*BROWSER BUGS: */
    /*IE11 - playbackRate greater than 2.0 appears to be buggy.*/
    /*Chrome 32 - if current_video_player and to_video player use the same src path this will not work*/
    /*Purpose: Sync a duplicate of the video to take over, while the other video is seeking to start of loop*/
    /*Or to sync frames in two different video files that should match to create a seemless transition from one video to the other*/
    //TESTED SUCCESS

    //should only be active once.
    function sync_video_to_video(current_video_player, current_video_position, to_video_player, to_video_position, abort_sync_time, call_back_when_complete) {
        //debug_log('[story_sync_video_to_video]: wiring up time update event');
        //if (!syncing_video) {
        clearInterval(scene_coarse_engine_handle); //fine engine will be taking over.
        if (syncing_video) {
            //console.log("sync_video_to_video called");            
            to_video_player[bz] = 0; //to_video_player should have volume set to 0 anyway before here.
            to_video_player[alb]();
            to_video_player[yiu]();

            //the difference between current_video_position and to_video_position specifies the desired difference in timings, the position of to_video_position is then varied
            //until that difference is as close as possible.

            //debug_log('[sync_video_to_video]: current_video_position: ' + current_video_position);
            //debug_log('[sync_video_to_video]: real current position: ' + current_video_player[ren]);
            //debug_log('[sync_video_to_video]: to_video_player position is: ' + to_video_player[ren] + ' the requested position is: ' + to_video_position);
            //debug_log('[sync_video_to_video]: scene_switching: ' + scene_switching);
            //debug_log('[sync_video_to_video]: change_scene_called: ' + current_scene.change_scene_called);

            if (to_video_player[ren] != to_video_position) {
                to_video_player[ren] = to_video_position;
            }

            //start the video we are going to switch to playing, if the current_video is playing.
            //$(current_video_player).on("timeupdate", function (event) { if (!current_video_player[ss] && to_video_player[ss] && current_video_player[ren] >= current_video_position) { to_video_player.play(); $(this).off(event); } });
            if (!current_video_player[ss] && to_video_player[ss] && current_video_player[ren] >= current_video_position) {
                to_video_player[alb]();
            }

            //TO DO: change to set interval and set timer to clear interval/abort sync after x amount of time.
            var initial_diff = current_video_player[ren] - ((current_video_position - to_video_position) + to_video_player[ren]);

            var d_now = new Date().getTime();

            /*var ii_abort = _AM.setTimeout(function () {
                to_video_player[yba] = 1.0;
                clearInterval(ii);
                //diff = current_video_player[ren] - ((current_video_position - to_video_position) + to_video_player[ren]);
                if ($.isFunction(call_back_when_complete)) {
                    //call the synced call back even though it failed.
                    call_back_when_complete();
                }
                //debug_log('[story_sync_video_frames]: sync aborted @ ' + diff + ' s ' + to_video_player[yba] + ' to_vid ' + to_video_player[ren] + ' current_vid ' + current_video_player[ren]);
            }, abort_sync_time * 1000);
            */

            //var ii = _AM.setInterval(function () {
            //    sync_video_to_video_helper(current_video_player, current_video_position, to_video_player, to_video_position, call_back_when_complete, initial_diff, d_now, ii, ii_abort);
            //}, 25);

            requestAnimationFrame(function () { sync_video_to_video_helper(current_video_player, current_video_position, to_video_player, to_video_position, abort_sync_time, call_back_when_complete, initial_diff, d_now); });

            /*$(to_video_player).on("timeupdate", function (event) {
                //seems to sometimes get called even when its not playing...
                if (!to_video_player.paused) {
                    var initial_diff = current_video_player[ren] - ((current_video_position - to_video_position) + to_video_player[ren]);
                    var d_now = Date.now();

                    var ii_abort = _AM.setTimeout(function () {
                        to_video_player[yba] = 1.0;
                        clearInterval(ii);
                        diff = current_video_player[ren] - ((current_video_position - to_video_position) + to_video_player[ren]);
                        if ($.isFunction(call_back_when_complete)) {
                            //call the synced call back even though it failed.
                            call_back_when_complete();
                        }
                        //debug_log('[story_sync_video_frames]: sync aborted @ ' + diff + ' s ' + to_video_player[yba] + ' to_vid ' + to_video_player[ren] + ' current_vid ' + current_video_player[ren]);
                    }, abort_sync_time * 1000);
                    var ii = _AM.setInterval(function () {
                        sync_video_to_video_helper(current_video_player, current_video_position, to_video_player, to_video_position, call_back_when_complete, initial_diff, d_now, ii, ii_abort);
                    }, 25);

                    $(this).off(event);
                }
            });*/
            //}
        }
    }
    
    //TESTED SUCCESS
    /*This function originally determined the time difference between the two videos and at what speed the other player needs to be played back at 
    * so the next tick of this function would result in the video's being very closely synced with only a small playback speed left for the next iteration (resulting in 2-3 calls max). Unfortantly
    * playback speed seems to only be reliable up to x2.0 speed in all browsers, so instead a stepped function is used with a max play back speed of 2.0
    * until it is with in 0.3 seconds then its dropped down to 1.25.
    */
    function sync_video_to_video_helper(current_video_player, current_video_position, to_video_player, to_video_position, abort_sync_time, call_back_when_complete, inital_diff, analysis_start_time) {
        if (syncing_video) {
            //console.log("sync_video_to_video helper called");
            //s = Math.random();
            diff = current_video_player[ren] - ((current_video_position - to_video_position) + to_video_player[ren]);
            var d_now = new Date().getTime();

            /**** The following is commented out because of an IE 11 BUG, playbackRates greater than 2.0 appear to fail badly. ****/
            /*if (diff > 1) {
                //debug_log('[sync_video_to_video_helper]:r' + s + ', 1B not synced behind @ ' + diff + ' s, rate ' + to_video_player[yba] + ' to_vid ' + to_video_player[ren] + ' current_vid ' + current_video_player[ren]);
                to_video_player[yba] = 2.0; //inital_diff * 2.0;
                debug_log('[sync_video_to_video_helper]:r' + s + ',1A not synced behind @ ' + diff + ' s, rate ' + to_video_player[yba] + ' to_vid ' + to_video_player[ren] + ' current_vid ' + current_video_player[ren]);
                //setTimeout(function () { story_sync_video_frames_helper(current_video_player, current_video_position, to_video_player, to_video_position, call_back_when_complete, inital_diff, analysis_start_time); }, 10);
            } else if (diff < -1) {
                //debug_log('[sync_video_to_video_helper]:r' + s + ',2B not synced behind @ ' + diff + ' s, rate' + to_video_player[yba] + ' to_vid ' + to_video_player[ren] + ' current_vid ' + current_video_player[ren]);
                to_video_player[yba] = 0.5; //-1 / (inital_diff * 2.0);
                debug_log('[sync_video_to_video_helper]:r' + s + ',2A not synced behind @ ' + diff + ' s, rate' + to_video_player[yba] + ' to_vid ' + to_video_player[ren] + ' current_vid ' + current_video_player[ren]);
                //setTimeout(function () { story_sync_video_frames_helper(current_video_player, current_video_position, to_video_player, to_video_position, call_back_when_complete, inital_diff, analysis_start_time); }, 10);
            } else */
            if (diff > 0.3 && to_video_player[yba] != 2.0) {
                //debug_log('[sync_video_to_video_helper]:r' + s + ',3B not synced behind @ ' + diff + ' s, rate ' + to_video_player[yba] + ' to_vid ' + to_video_player[ren] + ' current_vid ' + current_video_player[ren]);
                to_video_player[yba] = 2.0;
                //debug_log('[sync_video_to_video_helper]:r' + s + ',3A not synced behind @ ' + diff + ' s, rate ' + to_video_player[yba] + ' to_vid ' + to_video_player[ren] + ' current_vid ' + current_video_player[ren]);
                //setTimeout(function () { story_sync_video_frames_helper(current_video_player, current_video_position, to_video_player, to_video_position, call_back_when_complete, inital_diff, analysis_start_time); }, 10);
            } else if (diff < -0.3 && to_video_player[yba] != 0.5) {
                //debug_log('[sync_video_to_video_helper]:r' + s + ',4A not synced behind @ ' + diff + ' s, rate' + to_video_player[yba] + ' to_vid ' + to_video_player[ren] + ' current_vid ' + current_video_player[ren]);
                to_video_player[yba] = 0.5;
                //debug_log('[sync_video_to_video_helper]:r' + s + ',4B not synced behind @ ' + diff + ' s, rate' + to_video_player[yba] + ' to_vid ' + to_video_player[ren] + ' current_vid ' + current_video_player[ren]);
                //setTimeout(function () { story_sync_video_frames_helper(current_video_player, current_video_position, to_video_player, to_video_position, call_back_when_complete, inital_diff, analysis_start_time); }, 10);
            } else if (diff >= 0.04 && diff <= 0.3 && to_video_player[yba] != 1.25) {
                //debug_log('[sync_video_to_video_helper]:r' + s + ',5B not synced behind @ ' + diff + ' s, rate ' + to_video_player[yba] + ' to_vid ' + to_video_player[ren] + ' current_vid ' + current_video_player[ren]);
                to_video_player[yba] = 1.25;
                //debug_log('[sync_video_to_video_helper]:r' + s + ',5A not synced behind @ ' + diff + ' s, rate ' + to_video_player[yba] + ' to_vid ' + to_video_player[ren] + ' current_vid ' + current_video_player[ren]);
                //setTimeout(function () { story_sync_video_frames_helper(current_video_player, current_video_position, to_video_player, to_video_position, call_back_when_complete, inital_diff, analysis_start_time); }, 10);
            } else if (diff <= -0.04 && diff >= -0.3 && to_video_player[yba] != 0.75) {
                //debug_log('[sync_video_to_video_helper]:r' + s + ',6B not synced behind @ ' + diff + ' s, rate ' + to_video_player[yba] + ' to_vid ' + to_video_player[ren] + ' current_vid ' + current_video_player[ren]);
                to_video_player[yba] = 0.75;
                //debug_log('[sync_video_to_video_helper]:r' + s + ',6A not synced behind @ ' + diff + ' s, rate ' + to_video_player[yba] + ' to_vid ' + to_video_player[ren] + ' current_vid ' + current_video_player[ren]);
                //setTimeout(function () { story_sync_video_frames_helper(current_video_player, current_video_position, to_video_player, to_video_position, call_back_when_complete, inital_diff, analysis_start_time); }, 10);
            } else if ((d_now - analysis_start_time) > abort_sync_time) {
                //it has tried to sync long enough, abort the sync.
                //debug_log('[sync_video_to_video_helper]:r' + s + ', aborted not synced behind @ ' + diff + ' s, rate ' + to_video_player[yba] + ' to_vid ' + to_video_player[ren] + ' current_vid ' + current_video_player[ren]);
                to_video_player[yba] = 1.0;
                if ($.isFunction(call_back_when_complete)) {
                    call_back_when_complete();
                }
                syncing_video = false;


                //debug_log('===========');
                //debug_log('===========');
                //debug_log('===========');
                return;

            } else if (diff > -0.04 && diff < 0.04) {
                //debug_log('[sync_video_to_video_helper]:r' + s + ', synced @ ' + diff + ' s, rate ' + to_video_player[yba] + ' to_vid ' + to_video_player[ren] + ' current_vid ' + current_video_player[ren]);
                to_video_player[yba] = 1.0;
                if ($.isFunction(call_back_when_complete)) {
                    call_back_when_complete();
                }
                syncing_video = false;

                //debug_log('===========');
                //debug_log('===========');
                //debug_log('===========');
                return;
                //d_now = Date.now();
                //debug_log('[sync_video_to_video_helper]: Complete! - init diff: ' + inital_diff + ' s. synced to ' + diff + ' s ' + ' in ' + (d_now - analysis_start_time) + ' ms');
                //clearInterval(ii);
                //clearInterval(ii_abort);
            }

            requestAnimationFrame(function () { sync_video_to_video_helper(current_video_player, current_video_position, to_video_player, to_video_position, abort_sync_time, call_back_when_complete, inital_diff, analysis_start_time) });
            //} else {
            //syncing video must have been aborted.
            //   clearInterval(ii);
            //    clearInterval(ii_abort);
            //}
        }
    }

    /*Purpose used to transition between different audio files*/
    //TESTED SUCCESS
    function splice_audio(from_player, from_vol_graph, to_player, to_vol_graph, call_back_when_spliced) {
        splicing_audio = true;
        var startTime = Date.now();
        var ii;

        //set up the time step for calling the helper function.
        var start_time = Date.now();
        ii = _AM.setInterval(function () { splice_audio_helper(from_player, from_vol_graph, to_player, to_vol_graph, start_time, call_back_when_spliced, ii); }, 25);
    }

    //TESTED SUCCESS
    function splice_audio_helper(from_player, from_vol_graph, to_player, to_vol_graph, start_time, call_back_when_spliced, ii)
    {
        if (splicing_audio) {
            //console.log("splice audio helper: running");
            var n = Date.now();
            var t = (n - start_time) / 1000;
            var complete = 0;

            if (from_player != null) {
                var from_vol_graph_max = from_vol_graph.length - 1;
                //locate the time we are at for the from_player.
                for (i = from_vol_graph_max; i >= 0; i--) {
                    if (from_vol_graph[i][0] < t) {
                        if (i == from_vol_graph_max) {
                            //should aleady be at end of graph.
                            from_player[bz] = from_vol_graph[i][1] * _AM.video_stream_volume;
                            //pause playback of video that is now at zero volume.
                            //console.log("splice audio helper: paused");
                            from_player[yiu]();
                            complete++;
                            break;
                        } else {
                            //create linear approximation                   
                            from_player[bz] = (((from_vol_graph[i + 1][1] - from_vol_graph[i][1]) / (from_vol_graph[i + 1][0] - from_vol_graph[i][0])) * (t - from_vol_graph[i][0]) + from_vol_graph[i][1]) * _AM.video_stream_volume;
                            break;
                        }
                    }
                }

                //debug_log('[splice_audio_helper]: from_vol @ ' + from_player.volume);
            } else {
                //nothing to do.
                complete++;
            }

            if (to_player != null) {
                var to_vol_graph_max = to_vol_graph.length - 1;
                //locate the time we are at for the to_player.
                for (i = to_vol_graph_max; i >= 0; i--) {
                    if (to_vol_graph[i][0] < t) {
                        if (i == to_vol_graph_max) {
                            //should aleady be at end of graph.
                            to_player[bz] = to_vol_graph[i][1] * _AM.video_stream_volume;
                            complete++;
                            break;
                        } else {
                            //create linear approximation                   
                            to_player[bz] = (((to_vol_graph[i + 1][1] - to_vol_graph[i][1]) / (to_vol_graph[i + 1][0] - to_vol_graph[i][0])) * (t - to_vol_graph[i][0]) + to_vol_graph[0][1]) * _AM.video_stream_volume;
                            break;
                        }
                    }
                }

                //debug_log('[splice_audio_helper]: to_vol @ ' + to_player.volume);
            } else {
                //nothing to do.
                complete++;
            }


            if (complete == 2) {
                //vol/time graphs complete, stop interval.

                if ($.isFunction(call_back_when_spliced)) {
                    //console.log("audio_splice: calling call_back_when_spliced();");
                    _AM.setTimeout(call_back_when_spliced, 25); //schedule call back functions execution.
                }

                clearInterval(ii);
                //debug_log('[splice_audio_helper]: Complete! - vol spliced in ' + t*1000.0 + ' s');
            }
        } else {
            //abort sound transition.
            //console.log("audio_splice: abort");
            /*from_player[bz] = _AM.video_stream_volume;
            to_player[bz] = 0;*/
            clearInterval(ii);
        }
    }        


    function animate_image(img) {        
        //var ii;

        //set up the time step for calling the helper function.
        //var start_time = Date.now();
        //img[kl] = Date.now();
        img.is_animating = true;
        //img[kl] = img[ou]; //_AM.video_streams[video_stream_idx][ren];

        //now its triggered change the time so its always triggered, for start...
        //if (img.animate_shape && img.animate_shape[img.animate_shape.length - 1]) {
        //    img.animate_duration = img.animate_shape[img.animate_shape.length - 1] - img[ou];

        //how many times does duration fit into the start time.
        if (img.loop_animate == 0) {
            img[kl] = img[ou];
        } else {
            fit = Math.floor(img[ou] / img.animate_duration) + 1;
            //adjust start time so its negative, forces triggered.
            img[kl] = img[ou] - (fit * img.animate_duration);
        }
        //}
        
        //ii = _AM.setInterval(function () { animate_image_helper(img, ii); }, 25); //approximatly 12fps
        requestAnimationFrame(function () { animate_image_helper(img); });
    }


    _AM.get_animated_image = function get_animated_image(img, currentTime) {
        //var n = Date.now();
        //var n = _AM.video_streams[video_stream_idx][ren];
        var n = currentTime;
        //var t = (n - start_time) / 1000;
        var t

        if (img.loop_animate == 0 || img[kl] == img[ou]) {
            t = n - img[kl];
        } else {
            t = (n - img[kl]) % img.animate_duration;
        }

        var animate_shape_max = img.animate_shape.length - 1;

        //locate the time we are at for the from_player.
        for (var i = animate_shape_max; i >= 0; i--) {
            if (img.animate_shape[i].time <= t) {
                if (i == animate_shape_max) {
                    //should aleady be at end of graph.
                    //if (img.loop_animate == 0) {
                    return JSON.parse(JSON.stringify(img.animate_shape[animate_shape_max]));
                    //}

                    //break;
                } else {
                    tmp_shape = img.animate_shape[i];
                    tmp_shape_p1 = img.animate_shape[i + 1];
                    res_shape = { time: 0, num: [], com: [] };

                    //go through all co-ordinates in animate shape
                    //split the path command up to get the numbers and rebuild it...
                    var c;
                    for (c = 0; c < img.animate_shape[i].num.length; c++) {
                        res_shape.num.push(((tmp_shape_p1.num[c] - tmp_shape.num[c]) / (tmp_shape_p1.time - tmp_shape.time)) * (t - img.animate_shape[i].time) + tmp_shape.num[c]);
                        res_shape.com.push(tmp_shape.com[c]);
                    }

                    /*if (c != tmp_shape.com.length) {
                        //assuming last command is a Z.
                        res_shape.com.push(tmp_shape.com[c]);
                    }*/

                    return res_shape;
                }
            }
        }

        //found no matching, use start point.
        return JSON.parse(JSON.stringify(img.animate_shape[0]));
    }
      
    //animate_shape = [[0,"25,0,50,50,0,50"], [5, "25,0,40,40,0,40"]]    
    //animate_shape = [[t1, path1_d], [t2, path2_d]]    
    //where t1 and t2 are times and path1_d and path2_d are the svg paths to draw, all steps must have the same number of points.
    _AM.anim_image_helper = function anim_image_helper(img, s_pause) {
        img[kl] = img[ou];
        animate_image_helper(img, s_pause);
    }

    
    function animate_image_helper(img, s_pause) {
        if (_AM.scene_paused) {
            s_pause = 1;
        }
        //var n = Date.now();
        var n = _AM.video_streams[video_stream_idx][ren];
        //var t = (n - start_time) / 1000;
        var t

        if (img.loop_animate == 0 || img[kl] == img[ou]) {
            t = n - img[kl];
        } else {
            //if (n - img[kl] > img.animate_duration) {
                t = (n - img[kl]) % img.animate_duration;
            //} else {
            //    t = n - img[kl];
            //}
        }
        
        var animate_shape_max = img.animate_shape.length-1;
  
            //locate the time we are at for the from_player.
            for (var i = animate_shape_max; i >= 0; i--) {
                if (parseFloat(img.animate_shape[i].time) <= t) {
                    if (i == animate_shape_max) {
                        //should aleady be at end of graph.
                        //moved the following 3 lines out side of loop_animate rc 2014-11-22
                        img.image_svg_path.setAttributeNS(null, "d", convert_path_obj_to_d(img.animate_shape[animate_shape_max]));

                        if (img.image_svg_img) {
                            img.image_svg_img.setAttributeNS(null, 'x', img.animate_shape[animate_shape_max].num[0]);
                            img.image_svg_img.setAttributeNS(null, 'y', img.animate_shape[animate_shape_max].num[1]);
                        }
                        if (img.loop_animate == 0) {
                            //stop animating, nothing left to do.
                            img.is_animating = false;
                        } 
                        //clearInterval(ii);
                        return;
                        
                    } else {
                        //create linear approximation     
                        //img.x = (((animate_path[i + 1][1] - animate_path[i][1]) / (animate_path[i + 1][0] - animate_path[i][0])) * (t - animate_path[i][0]) + animate_path[i][1]);
                        //img.y = (((animate_path[i + 1][2] - animate_path[i][2]) / (animate_path[i + 1][0] - animate_path[i][0])) * (t - animate_path[i][0]) + animate_path[i][2]);

                        
                            tmp_shape = img.animate_shape[i];
                            tmp_shape_p1 = img.animate_shape[i + 1];
                            res_shape = { time: 0, num:[], com:[]};

                            //go through all co-ordinates in animate shape
                            //split the path command up to get the numbers and rebuild it...
                            var c;
                            for (c = 0; c < img.animate_shape[i].num.length; c++) {
                                res_shape.num.push(((tmp_shape_p1.num[c] - tmp_shape.num[c]) / (tmp_shape_p1.time - tmp_shape.time)) * (t - img.animate_shape[i].time) + tmp_shape.num[c]);
                                res_shape.com.push(tmp_shape.com[c]);
                            }

                            /*if (c != tmp_shape.com.length) {
                                //assuming last command is a Z.
                                res_shape.com.push(tmp_shape.com[c]);
                            }*/

                            img.image_svg_path.setAttributeNS(null, "d", convert_path_obj_to_d(res_shape));

                            if (img.image_svg_img) {
                                img.image_svg_img.setAttributeNS(null, 'x', res_shape.num[0]);
                                img.image_svg_img.setAttributeNS(null, 'y', res_shape.num[1]);
                            }
                        //img.image_area.setAttribute('coords', get_coords(res_shape));
                        

                        //img.svg.setAttribute('style', 'left:' + (video_offset.left + (img.x * video_intrinsic_scale)) + 'px; top:' + (video_offset.top + (img.y * video_intrinsic_scale)) + 'px; opacity:' + $(img.image_div).css("opacity"));                        

                        //only continue animation if the Scene is not paused.
                        if (!s_pause) {
                            requestAnimationFrame(function () { animate_image_helper(img); });
                        }
                        return;
                        
                    }
                }
            }

            img.image_svg_path.setAttributeNS(null, "d", convert_path_obj_to_d(img.animate_shape[animate_shape_max]));

            if (img.image_svg_img) {
                img.image_svg_img.setAttributeNS(null, 'x', img.animate_shape[animate_shape_max].num[0]);
                img.image_svg_img.setAttributeNS(null, 'y', img.animate_shape[animate_shape_max].num[1]);
            }

            if (!s_pause) {
                requestAnimationFrame(function () { animate_image_helper(img); });
            }
    }

}(window._AM = window._AM || {}, jQuery));

window._AM_loaded = true;