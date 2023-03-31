import React, { useState, useRef } from 'react'
import ReactCrop, {
    centerCrop,
    makeAspectCrop,
    Crop,
    PixelCrop,
} from 'react-image-crop'
import { canvasPreview } from './canvasPreview'
import { useDebounceEffect } from './useDebounceEffect'
import 'react-image-crop/dist/ReactCrop.css'
import { Editor } from '@tiptap/react';
import { Button, Input, FileInput, Avatar, Switch, Flex } from '@mantine/core';
import { IconFileUpload } from '@tabler/icons'

function centerAspectCrop(
    mediaWidth: number,
    mediaHeight: number,
    aspect: number,
) {
    return centerCrop(
        makeAspectCrop(
            {
                unit: '%',
                width: 90,
            },
            aspect,
            mediaWidth,
            mediaHeight,
        ),
        mediaWidth,
        mediaHeight,
    )
}


interface propsType {
    editor: Editor | null,
    close: () => void
}

export default function CropImg(props: propsType) {
    const { editor, close } = props

    const [imgSrc, setImgSrc] = useState('')
    const [crop, setCrop] = useState<Crop>()
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
    const [scale, setScale] = useState(1)
    const [rotate, setRotate] = useState(0)
    const [aspect, setAspect] = useState<number | undefined>(16 / 9)

    const previewCanvasRef = useRef<HTMLCanvasElement>(null)
    const imgRef = useRef<HTMLImageElement>(null)
    const hiddenAnchorRef = useRef<HTMLAnchorElement>(null)
    const blobUrlRef = useRef('')

    function onSelectFile(file: File) {
        setCrop(undefined) // Makes crop preview update between images.
        const reader = new FileReader()
        reader.addEventListener('load', () =>
            setImgSrc(reader.result?.toString() || ''),
        )
        reader.readAsDataURL(file)
    }

    function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
        if (aspect) {
            const { width, height } = e.currentTarget
            setCrop(centerAspectCrop(width, height, aspect))
        }
    }

    function onDownloadCropClick() {
        if (!previewCanvasRef.current) {
            throw new Error('Crop canvas does not exist')
        }

        previewCanvasRef.current.toBlob((blob) => {
            if (!blob) {
                throw new Error('Failed to create blob')
            }
            if (blobUrlRef.current) {
                URL.revokeObjectURL(blobUrlRef.current)
            }
            blobUrlRef.current = URL.createObjectURL(blob)
            hiddenAnchorRef.current!.href = blobUrlRef.current
            hiddenAnchorRef.current!.click()
        })
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
                canvasPreview(
                    imgRef.current,
                    previewCanvasRef.current,
                    completedCrop,
                    scale,
                    rotate,
                )
            }
        },
        100,
        [completedCrop, scale, rotate],
    )

    function handleToggleAspectClick() {
        if (aspect) {
            setAspect(undefined)
        } else if (imgRef.current) {
            const { width, height } = imgRef.current
            setAspect(16 / 9)
            setCrop(centerAspectCrop(width, height, 16 / 9))
        }
    }

    const uploadRef = useRef<HTMLButtonElement>(null);

    function handleInsertImg() {
        if (!previewCanvasRef.current) {
            throw new Error('Crop canvas does not exist')
        }
        previewCanvasRef.current.toBlob((blob) => {
            if (!blob) {
                throw new Error('Failed to create blob')
            }
            if (blobUrlRef.current) {
                URL.revokeObjectURL(blobUrlRef.current)
            }
            blobUrlRef.current = URL.createObjectURL(blob)
            // hiddenAnchorRef.current!.href = blobUrlRef.current
            // hiddenAnchorRef.current!.click()
            editor?.chain().focus().setImage({ src: blobUrlRef.current }).run()
            console.log(blobUrlRef.current)
        })
        close()
    }

    return (
        <div className="App">
            <div className="Crop-Controls">

                {/* <input type="file" accept="image/*" onChange={onSelectFile} style='display: none' /> */}
                <FileInput accept='image/*' ref={uploadRef} onChange={e => onSelectFile(e!)} style={{ display: 'none' }} />
                <Avatar color="blue" radius="sm" style={{ cursor: 'pointer' }} onClick={() => uploadRef!.current!.click()}>
                    <IconFileUpload size="1.5rem" />

                </Avatar>
                <div>
                    <label htmlFor="scale-input">Scale: </label>
                    <Input
                        id="scale-input"
                        type="number"
                        // defaultValue={1}
                        min={1}
                        step={0.1}
                        // max={1}
                        value={scale}
                        disabled={!imgSrc}
                        onChange={e => setScale(Number(e.target.value))}
                        placeholder='Scale'
                    />
                </div>
                <div>
                    <label htmlFor="rotate-input">Rotate: </label>
                    <Input
                        id="rotate-input"
                        type="number"
                        // defaultValue={1}
                        min={1}
                        step={0.1}
                        // max={1}
                        value={rotate}
                        disabled={!imgSrc}
                        onChange={(e) =>
                            setRotate(Math.min(180, Math.max(-180, Number(e!.target!.value))))
                        }
                        placeholder="Rotate"
                    />
                </div>
                <div>
                    <Flex
                        mih={50}
                        bg="rgba(0, 0, 0, .3)"
                        gap="md"
                        justify="flex-start"
                        align="center"
                        direction="row"
                        wrap="wrap"
                    >
                        Toggle aspect <Switch onLabel="ON" offLabel="OFF" onClick={handleToggleAspectClick} />;
                    </Flex>

                </div>
            </div>
            {!!imgSrc && (
                <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={aspect}
                >
                    <img
                        ref={imgRef}
                        alt="Crop me"
                        src={imgSrc}
                        style={{ transform: `scale(${scale}) rotate(${rotate}deg)` }}
                        onLoad={onImageLoad}
                    />
                </ReactCrop>
            )}
            {!!completedCrop && (
                <>
                    <div>
                        <canvas
                            ref={previewCanvasRef}
                            style={{
                                border: '1px solid black',
                                objectFit: 'contain',
                                width: completedCrop.width,
                                height: completedCrop.height,
                            }}
                        />
                    </div>
                    <Button onClick={handleInsertImg}>
                        Done
                    </Button>
                    {/* <div>
            <button onClick={onDownloadCropClick}>Download Crop</button>
            <a
              ref={hiddenAnchorRef}
              download
              style={{
                position: 'absolute',
                top: '-200vh',
                visibility: 'hidden',
              }}
            >
              Hidden download
            </a>
          </div> */}

                </>
            )}
        </div>
    )
}
