import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { KaraokeAudioSurface } from "../karaoke-audio-surface";
import { realSongRawKaraokeLines } from "../fixtures/real-song";
import { getLyricDurationMs } from "../karaoke-timing";
import { toKaraokeStageLines } from "../lyric-transform";

const artworkSrc = "https://picsum.photos/seed/pirate-karaoke-audio/160/160";

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function createSineWaveWavUrl(durationMs: number) {
  const sampleRate = 22050;
  const channelCount = 1;
  const bytesPerSample = 2;
  const sampleCount = Math.floor((durationMs / 1000) * sampleRate);
  const dataSize = sampleCount * channelCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channelCount * bytesPerSample, true);
  view.setUint16(32, channelCount * bytesPerSample, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const time = sampleIndex / sampleRate;
    const carrier = Math.sin(2 * Math.PI * 220 * time);
    const tremolo = 0.45 + (0.25 * Math.sin(2 * Math.PI * 2 * time));
    const sample = Math.round(carrier * tremolo * 0x7fff);

    view.setInt16(44 + sampleIndex * bytesPerSample, sample, true);
  }

  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}

function useGeneratedAudioUrl(durationMs: number) {
  const [url, setUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    const nextUrl = createSineWaveWavUrl(durationMs);
    setUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [durationMs]);

  return url;
}

interface AudioStoryProps {
  initialTimeMs?: number;
  timingOffsetMs?: number;
}

function RealAudioStory({
  initialTimeMs = 0,
  timingOffsetMs = 0,
}: AudioStoryProps) {
  const [offsetMs, setOffsetMs] = React.useState(timingOffsetMs);
  const lines = React.useMemo(() => toKaraokeStageLines(realSongRawKaraokeLines), []);
  const audioUrl = useGeneratedAudioUrl(getLyricDurationMs(lines));

  if (!audioUrl) {
    return null;
  }

  return (
    <KaraokeAudioSurface
      artistName="The Castaways"
      artworkSrc={artworkSrc}
      initialTimeMs={initialTimeMs}
      instrumentalAudioUrl={audioUrl}
      lines={lines}
      onExit={() => undefined}
      onTimingOffsetReset={() => setOffsetMs(0)}
      timingOffsetMs={offsetMs}
      title="Midnight Waves"
    />
  );
}

const meta = {
  title: "Compositions/Karaoke/KaraokeAudioSurface",
  component: KaraokeAudioSurface,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof KaraokeAudioSurface>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithRealAudio: Story = {
  render: () => <RealAudioStory />,
};

export const Ended: Story = {
  render: () => <RealAudioStory initialTimeMs={30200} />,
};

export const Drift: Story = {
  render: () => <RealAudioStory timingOffsetMs={300} />,
};

export const AudioLoading: Story = {
  render: function AudioLoadingRender() {
    const lines = React.useMemo(() => toKaraokeStageLines(realSongRawKaraokeLines), []);

    return (
      <KaraokeAudioSurface
        artistName="The Castaways"
        artworkSrc={artworkSrc}
        lines={lines}
        title="Loading Instrumental"
      />
    );
  },
};

export const AudioError: Story = {
  render: function AudioErrorRender() {
    const lines = React.useMemo(() => toKaraokeStageLines(realSongRawKaraokeLines), []);

    return (
      <KaraokeAudioSurface
        artistName="The Castaways"
        artworkSrc={artworkSrc}
        instrumentalAudioUrl="/missing-karaoke-fixture.wav"
        lines={lines}
        title="Missing Instrumental"
      />
    );
  },
};
