/**
 * @flow
 */

import React from 'react';
import {
  Dimensions,
  Image,
  Slider,
  StyleSheet,
  Text,
  TouchableHighlight,
  View,
} from 'react-native';
import Expo, { Asset, Audio, Font } from 'expo';

class Icon {
  constructor(module, width, height) {
    this.module = module;
    this.width = width;
    this.height = height;
    Asset.fromModule(this.module).downloadAsync();
  }
}

class PlaylistItem {
  constructor(name, source) {
    this.name = name;
    this.source = source;
    this.sound = null;
  }

  async getLoadedSound() {
    if (this.sound == null) {
      if (typeof source === 'number') {
        // source is an asset module, so let's download it for better performance
        await Asset.fromModule(this.source).downloadAsync();
      }
      this.sound = new Audio.Sound({ source: this.source });
    }
    await this.sound.loadAsync();
    return this.sound;
  }
}

const PLAYLIST = [
  new PlaylistItem(
    'Comfort Fit - “Sorry”',
    'https://s3.amazonaws.com/exp-us-standard/audio/playlist-example/Comfort_Fit_-_03_-_Sorry.mp3'
  ),
  new PlaylistItem(
    'Mildred Bailey – “All Of Me”',
    'https://ia800304.us.archive.org/34/items/PaulWhitemanwithMildredBailey/PaulWhitemanwithMildredBailey-AllofMe.mp3'
  ),
  new PlaylistItem(
    'Podington Bear - “Rubber Robot”',
    'https://s3.amazonaws.com/exp-us-standard/audio/playlist-example/Podington_Bear_-_Rubber_Robot.mp3'
  ),
];

const ICON_PLAY_BUTTON = new Icon(
  require('./assets/images/play_button.png'),
  34,
  51
);
const ICON_PAUSE_BUTTON = new Icon(
  require('./assets/images/pause_button.png'),
  34,
  51
);
const ICON_STOP_BUTTON = new Icon(
  require('./assets/images/stop_button.png'),
  22,
  22
);
const ICON_FORWARD_BUTTON = new Icon(
  require('./assets/images/forward_button.png'),
  33,
  25
);
const ICON_BACK_BUTTON = new Icon(
  require('./assets/images/back_button.png'),
  33,
  25
);

const ICON_LOOP_ALL_BUTTON = new Icon(
  require('./assets/images/loop_all_button.png'),
  77,
  35
);
const ICON_LOOP_ONE_BUTTON = new Icon(
  require('./assets/images/loop_one_button.png'),
  77,
  35
);

const ICON_MUTED_BUTTON = new Icon(
  require('./assets/images/muted_button.png'),
  67,
  58
);
const ICON_UNMUTED_BUTTON = new Icon(
  require('./assets/images/unmuted_button.png'),
  67,
  58
);

const ICON_TRACK_1 = new Icon(require('./assets/images/track_1.png'), 166, 5);
const ICON_THUMB_1 = new Icon(require('./assets/images/thumb_1.png'), 18, 19);
const ICON_THUMB_2 = new Icon(require('./assets/images/thumb_2.png'), 15, 19);

const LOOPING_TYPE_ALL = 0;
const LOOPING_TYPE_ONE = 1;
const LOOPING_TYPE_ICONS = { 0: ICON_LOOP_ALL_BUTTON, 1: ICON_LOOP_ONE_BUTTON };

const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT } = Dimensions.get('window');
const BACKGROUND_COLOR = '#FFF8ED';
const DISABLED_OPACITY = 0.5;
const LOADING_STRING = '... loading ...';
const RATE_SCALE = 3.0;

class App extends React.Component {
  constructor(props) {
    super(props);
    this.index = 0;
    this.sound = null;
    this.isSeeking = false;
    this.shouldPlayAtEndOfSeek = false;
    this.state = {
      soundName: '',
      loopingType: LOOPING_TYPE_ALL,
      muted: false,
      soundPosition: null,
      soundDuration: null,
      isPlaying: false,
      isLoading: true,
      fontLoaded: false,
      shouldCorrectPitch: true,
      volume: 1.0,
      rate: 1.0,
    };
  }

  componentDidMount() {
    Audio.setIsEnabledAsync(true);
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      playsInSilentLockedModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
    });
    (async () => {
      await Font.loadAsync({
        'cutive-mono-regular': require('./assets/fonts/CutiveMono-Regular.ttf'),
      });
      this.setState({ fontLoaded: true });
    })();
    this._updateSoundForIndex();
  }

  _updateScreenForLoading(isLoading) {
    if (isLoading) {
      this.setState({
        isPlaying: false,
        soundName: LOADING_STRING,
        soundDuration: null,
        soundPosition: null,
        isLoading: true,
      });
    } else {
      this.setState({
        soundName: PLAYLIST[this.index].name,
        isLoading: false,
      });
    }
  }

  _updateScreenForStatus = status => {
    if (status.isLoaded) {
      this.setState({
        soundPosition: status.positionMillis,
        soundDuration: status.durationMillis,
        isPlaying: status.isPlaying,
        rate: status.rate,
        muted: status.isMuted,
        volume: status.volume,
        loopingType: status.isLooping ? LOOPING_TYPE_ONE : LOOPING_TYPE_ALL,
        shouldCorrectPitch: status.shouldCorrectPitch,
      });
      if (status.didJustFinish) {
        this._advanceIndex(true);
        this._updateSoundForIndex(true);
      }
    }
  };

  _advanceIndex(forward) {
    this.index =
      (this.index + (forward ? 1 : PLAYLIST.length - 1)) % PLAYLIST.length;
  }

  async _updateSoundForIndex(playing) {
    if (this.sound != null) {
      await this.sound.unloadAsync();
      this.sound.setCallback(null);
    }
    this._updateScreenForLoading(true);
    this.sound = null;

    const sound = await PLAYLIST[this.index].getLoadedSound();
    await sound.setIsMutedAsync(this.state.muted);
    await sound.setIsLoopingAsync(this.state.loopingType === LOOPING_TYPE_ONE);
    await sound.setVolumeAsync(this.state.volume);
    await sound.setRateAsync(this.state.rate, this.state.shouldCorrectPitch);
    sound.setCallback(this._updateScreenForStatus);
    this.sound = sound;

    if (playing) {
      await this.sound.playAsync(); // Will call callback to update the screen.
    } else {
      await this.sound.getStatusAsync(); // Will call callback to update the screen.
    }
    this._updateScreenForLoading(false);
  }

  _onPlayPausePressed = () => {
    if (this.sound != null) {
      if (this.state.isPlaying) {
        this.sound.pauseAsync();
      } else {
        this.sound.playAsync();
      }
    }
  };

  _onStopPressed = () => {
    if (this.sound != null) {
      this.sound.stopAsync();
    }
  };

  _onForwardPressed = () => {
    if (this.sound != null) {
      this._advanceIndex(true);
      this._updateSoundForIndex(this.state.isPlaying);
    }
  };

  _onBackPressed = () => {
    if (this.sound != null) {
      this._advanceIndex(false);
      this._updateSoundForIndex(this.state.isPlaying);
    }
  };

  _onMutePressed = () => {
    if (this.sound != null) {
      this.sound.setIsMutedAsync(!this.state.muted);
    }
  };

  _onLoopPressed = () => {
    if (this.sound != null) {
      this.sound.setIsLoopingAsync(this.state.loopingType !== LOOPING_TYPE_ONE);
    }
  };

  _onVolumeSliderValueChange = value => {
    if (this.sound != null) {
      this.sound.setVolumeAsync(value);
    }
  };

  _trySetRate = async (rate, shouldCorrectPitch) => {
    if (this.sound != null) {
      try {
        await this.sound.setRateAsync(rate, shouldCorrectPitch);
      } catch (error) {
        // Rate changing could not be performed, possibly because the client's Android API is too old.
      }
    }
  };

  _onRateSliderSlidingComplete = async value => {
    this._trySetRate(value * RATE_SCALE, this.state.shouldCorrectPitch);
  };

  _onPitchCorrectionPressed = async value => {
    this._trySetRate(this.state.rate, !this.state.shouldCorrectPitch);
  };

  _onSeekSliderValueChange = value => {
    if (this.sound != null && !this.isSeeking) {
      this.isSeeking = true;
      this.shouldPlayAtEndOfSeek = this.state.isPlaying;
      this.sound.pauseAsync();
    }
  };

  _onSeekSliderSlidingComplete = async value => {
    if (this.sound != null) {
      this.isSeeking = false;
      await this.sound.setPositionAsync(value * this.state.soundDuration);
      if (this.shouldPlayAtEndOfSeek) {
        this.sound.playAsync();
      }
    }
  };

  _getSeekSliderPosition() {
    if (
      this.sound != null &&
      this.state.soundPosition != null &&
      this.state.soundDuration != null
    ) {
      return this.state.soundPosition / this.state.soundDuration;
    }
    return 0;
  }

  _getMMSSFromMillis(millis) {
    const totalSeconds = millis / 1000;
    const seconds = Math.floor(totalSeconds % 60);
    const minutes = Math.floor(totalSeconds / 60);

    const padWithZero = number => {
      const string = number.toString();
      if (number < 10) {
        return '0' + string;
      }
      return string;
    };
    return padWithZero(minutes) + ':' + padWithZero(seconds);
  }

  _getTimestamp() {
    if (
      this.sound != null &&
      this.state.soundPosition != null &&
      this.state.soundDuration != null
    ) {
      return `${this._getMMSSFromMillis(this.state.soundPosition)} / ${this._getMMSSFromMillis(this.state.soundDuration)}`;
    }
    return '';
  }

  render() {
    return (
      <View style={styles.container}>
        <View />
        <View style={styles.nameContainer}>
          {this.state.fontLoaded
            ? <Text style={{ ...Font.style('cutive-mono-regular') }}>
                {this.state.soundName}
              </Text>
            : null}
        </View>
        <View
          style={[
            styles.playbackContainer,
            {
              opacity: this.state.isLoading ? DISABLED_OPACITY : 1.0,
            },
          ]}>
          <Slider
            style={styles.playbackSlider}
            trackImage={ICON_TRACK_1.module}
            thumbImage={ICON_THUMB_1.module}
            value={this._getSeekSliderPosition()}
            onValueChange={this._onSeekSliderValueChange}
            onSlidingComplete={this._onSeekSliderSlidingComplete}
            disabled={this.state.isLoading}
          />
          {this.state.fontLoaded
            ? <Text
                style={[
                  styles.timestamp,
                  { ...Font.style('cutive-mono-regular') },
                ]}>
                {this._getTimestamp()}
              </Text>
            : null}
        </View>
        <View
          style={[
            styles.buttonsContainerBase,
            styles.buttonsContainerTopRow,
            {
              opacity: this.state.isLoading ? DISABLED_OPACITY : 1.0,
            },
          ]}>
          <TouchableHighlight
            underlayColor={BACKGROUND_COLOR}
            style={styles.wrapper}
            onPress={this._onBackPressed}
            disabled={this.state.isLoading}>
            <Image style={styles.button} source={ICON_BACK_BUTTON.module} />
          </TouchableHighlight>
          <TouchableHighlight
            underlayColor={BACKGROUND_COLOR}
            style={styles.wrapper}
            onPress={this._onPlayPausePressed}
            disabled={this.state.isLoading}>
            <Image
              style={styles.button}
              source={
                this.state.isPlaying
                  ? ICON_PAUSE_BUTTON.module
                  : ICON_PLAY_BUTTON.module
              }
            />
          </TouchableHighlight>
          <TouchableHighlight
            underlayColor={BACKGROUND_COLOR}
            style={styles.wrapper}
            onPress={this._onStopPressed}
            disabled={this.state.isLoading}>
            <Image style={styles.button} source={ICON_STOP_BUTTON.module} />
          </TouchableHighlight>
          <TouchableHighlight
            underlayColor={BACKGROUND_COLOR}
            style={styles.wrapper}
            onPress={this._onForwardPressed}
            disabled={this.state.isLoading}>
            <Image style={styles.button} source={ICON_FORWARD_BUTTON.module} />
          </TouchableHighlight>
        </View>
        <View
          style={[
            styles.buttonsContainerBase,
            styles.buttonsContainerMiddleRow,
          ]}>
          <View style={styles.volumeContainer}>
            <TouchableHighlight
              underlayColor={BACKGROUND_COLOR}
              style={styles.wrapper}
              onPress={this._onMutePressed}>
              <Image
                style={styles.button}
                source={
                  this.state.muted
                    ? ICON_MUTED_BUTTON.module
                    : ICON_UNMUTED_BUTTON.module
                }
              />
            </TouchableHighlight>
            <Slider
              style={styles.volumeSlider}
              trackImage={ICON_TRACK_1.module}
              thumbImage={ICON_THUMB_2.module}
              value={1}
              onValueChange={this._onVolumeSliderValueChange}
            />
          </View>
          <TouchableHighlight
            underlayColor={BACKGROUND_COLOR}
            style={styles.wrapper}
            onPress={this._onLoopPressed}>
            <Image
              style={styles.button}
              source={LOOPING_TYPE_ICONS[this.state.loopingType].module}
            />
          </TouchableHighlight>
        </View>
        <View
          style={[
            styles.buttonsContainerBase,
            styles.buttonsContainerBottomRow,
          ]}>
          {this.state.fontLoaded
            ? <Text
                style={[
                  styles.timestamp,
                  { ...Font.style('cutive-mono-regular') },
                ]}>
                Rate:
              </Text>
            : null}
          <Slider
            style={styles.rateSlider}
            trackImage={ICON_TRACK_1.module}
            thumbImage={ICON_THUMB_1.module}
            value={this.state.rate / RATE_SCALE}
            onSlidingComplete={this._onRateSliderSlidingComplete}
          />
          <TouchableHighlight
            underlayColor={BACKGROUND_COLOR}
            style={styles.wrapper}
            onPress={this._onPitchCorrectionPressed}>
            <View style={styles.button}>
              {this.state.fontLoaded
                ? <Text
                    style={[
                      styles.timestamp,
                      { ...Font.style('cutive-mono-regular') },
                    ]}>
                    PC: {this.state.shouldCorrectPitch ? 'yes' : 'no'}
                  </Text>
                : null}
            </View>
          </TouchableHighlight>
        </View>
        <View />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: BACKGROUND_COLOR,
  },
  wrapper: {},
  nameContainer: {
    height: DEVICE_HEIGHT * 2.0 / 5.0,
  },
  playbackContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'stretch',
    minHeight: ICON_THUMB_1.height * 2.0,
    maxHeight: ICON_THUMB_1.height * 2.0,
  },
  playbackSlider: {
    alignSelf: 'stretch',
  },
  timestamp: {
    textAlign: 'right',
    alignSelf: 'stretch',
    paddingRight: 20,
  },
  button: {
    backgroundColor: BACKGROUND_COLOR,
  },
  buttonsContainerBase: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonsContainerTopRow: {
    maxHeight: ICON_PLAY_BUTTON.height,
    minWidth: DEVICE_WIDTH / 2.0,
    maxWidth: DEVICE_WIDTH / 2.0,
  },
  buttonsContainerMiddleRow: {
    maxHeight: ICON_MUTED_BUTTON.height,
    alignSelf: 'stretch',
    paddingRight: 20,
  },
  volumeContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: DEVICE_WIDTH / 2.0,
    maxWidth: DEVICE_WIDTH / 2.0,
  },
  volumeSlider: {
    width: DEVICE_WIDTH / 2.0 - ICON_MUTED_BUTTON.width,
  },
  buttonsContainerBottomRow: {
    maxHeight: ICON_THUMB_1.height,
    alignSelf: 'stretch',
    paddingRight: 20,
    paddingLeft: 20,
  },
  rateSlider: {
    width: DEVICE_WIDTH / 2.0,
  },
});

Expo.registerRootComponent(App);
