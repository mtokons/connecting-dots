import React from 'react';
import { StudioScene } from '../../types/studio';
import HostView from './HostView';
import GuestView from './GuestView';
import TwoShotView from './TwoShotView';

interface SceneSwitcherProps {
  scene: StudioScene;
}

const SceneSwitcher: React.FC<SceneSwitcherProps> = ({ scene }) => {
  switch (scene) {
    case StudioScene.HOST:
      return <HostView />;
    case StudioScene.GUEST:
      return <GuestView />;
    case StudioScene.TWO_SHOT:
    case StudioScene.HOST_GUEST:
      return <TwoShotView />;
    case StudioScene.INTRO:
    case StudioScene.OUTRO:
    case StudioScene.SCREEN_SHARE:
      return <div style={{ color: '#fff' }}>{scene} Scene Placeholder</div>;
    default:
      return <TwoShotView />;
  }
};

export default SceneSwitcher;
