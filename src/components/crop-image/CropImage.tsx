import { Box, Button, Divider, Flex, Group, Stack, Switch, TextInput, Title } from "@mantine/core";
import { Editor } from "@tiptap/react";
import React, { useRef, useState } from "react";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { canvasPreview } from "./canvasPreview";
import { useDebounceEffect } from "./useDebounceEffect";

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

interface propsType {
  editor?: Editor | null;
  src: string;
  close: () => void;
  setStateAction?: React.Dispatch<React.SetStateAction<Blob | undefined>>;
}

export default function CropImg(props: propsType) {
  const { editor, src, close, setStateAction } = props;

  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [aspect, setAspect] = useState<number | undefined>(16 / 9);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const blobUrlRef = React.useRef("");

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    if (aspect) {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspect));
    }
  }

  useDebounceEffect(
    async () => {
      if (
        completedCrop?.width &&
        completedCrop?.height &&
        imgRef.current &&
        previewCanvasRef.current
      ) {
        // We use canvasPreview as it's much faster than imgPreview.
        canvasPreview(imgRef.current, previewCanvasRef.current, completedCrop, scale, rotate);
      }
    },
    100,
    [completedCrop, scale, rotate]
  );

  function handleToggleAspectClick() {
    if (aspect) {
      setAspect(undefined);
    } else if (imgRef.current) {
      const { width, height } = imgRef.current;
      setAspect(16 / 9);
      setCrop(centerAspectCrop(width, height, 16 / 9));
    }
  }

  function handleDone() {
    if (!previewCanvasRef.current) {
      throw new Error("Crop canvas does not exist");
    }
    previewCanvasRef.current.toBlob((blob) => {
      if (!blob) {
        throw new Error("Failed to create blob");
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
      blobUrlRef.current = URL.createObjectURL(blob);
      editor?.chain().focus().setImage({ src: blobUrlRef.current }).run();
      if (setStateAction) {
        setStateAction(blob);
      }
      close();
    });
  }

  return (
    <Stack spacing="xl">
      <Stack align="center">
        <Title order={2}>Crop image</Title>
      </Stack>
      <Group grow>
        <TextInput
          label="Scale"
          type="number"
          min={1}
          step={0.1}
          value={scale}
          disabled={!src}
          onChange={(e) => setScale(Number(e.target.value))}
          placeholder="Scale"
        />
        <TextInput
          label="Rotate"
          id="rotate-input"
          type="number"
          min={1}
          step={0.1}
          value={rotate}
          disabled={!src}
          onChange={(e) => setRotate(Math.min(180, Math.max(-180, Number(e!.target!.value))))}
          placeholder="Rotate"
        />
      </Group>
      <Flex justify="center">
        <Switch
          onLabel="ON"
          offLabel="OFF"
          labelPosition="left"
          onClick={handleToggleAspectClick}
          size="lg"
          color="brand"
          label="Toggle aspect"
        />
      </Flex>
      <Divider color="brand" />
      <Flex justify="space-evenly" align="center" wrap="wrap">
        <Box>
          {!!src && (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
            >
              <img
                ref={imgRef}
                alt="Crop me"
                src={src}
                style={{ transform: `scale(${scale}) rotate(${rotate}deg)` }}
                onLoad={onImageLoad}
              />
            </ReactCrop>
          )}
        </Box>
        {!!completedCrop && (
          <Box>
            <canvas
              ref={previewCanvasRef}
              style={{
                border: "1px solid #000",
                objectFit: "contain",
                width: completedCrop.width,
                height: completedCrop.height,
              }}
            />
          </Box>
        )}
      </Flex>
      <Button onClick={handleDone}>Done</Button>
    </Stack>
  );
}
