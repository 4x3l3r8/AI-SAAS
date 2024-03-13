"use client"

import {
    Form
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { aspectRatioOptions, creditFee, defaultValues, transformationTypes } from "@/constants"
import { AspectRatioKey, debounce, deepMergeObjects } from "@/lib/utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { CustomField } from "./CustomField"
import { Button } from "../ui/button"
import { MediaUploader } from "./MediaUploader"
import { TransformedImage } from "./TransformedImage"
import { getCldImageUrl } from "next-cloudinary"
import { addImage } from "@/lib/actions/image.actions"
import { useRouter } from "next/navigation"
import { updateImage } from "../../lib/actions/image.actions"
import { InsufficientCreditsModal } from "."
import { updateCredits } from "@/lib/actions/user.actions"


export const formSchema = z.object({
    title: z.string(),
    aspectRatio: z.string().optional(),
    color: z.string().optional(),
    prompt: z.string().optional(),
    publicId: z.string()
})


export const TransformationForm = ({ action, data = null, userId, type, creditBalance, config = null }: TransformationFormProps) => {
    const [isPending, startTransition] = useTransition()
    const transformationType = transformationTypes[type]
    const [image, setImage] = useState(data)
    const [newTransformation, setNewTransformation] = useState<Transformations | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [IsTransforming, setIsTransforming] = useState(false)
    const [transformationConfig, setTransformationConfig] = useState(config)
    const router = useRouter()


    const initialValues = data && action === "Update" ? {
        title: data?.title,
        aspectRatio: data?.aspectRatio,
        color: data?.color,
        prompt: data?.prompt,
        publicId: data?.publicId,
    } : defaultValues

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: initialValues,
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true)
        if (data || image) {
            const transformationURL = getCldImageUrl({
                width: image?.width,
                height: image?.height,
                src: image?.publicId,
                ...transformationConfig
            })

            const imageData = {
                title: values.title,
                publicId: image?.publicId,
                transformationType: type,
                width: image?.width,
                height: image?.height,
                config: transformationConfig,
                secureURL: image?.secureURL,
                transformationURL,
                aspectRatio: values.aspectRatio,
                prompt: values.prompt,
                color: values.color
            }

            if (action === "Add") {
                try {
                    const newImage = await addImage({
                        image: imageData,
                        userId,
                        path: '/'
                    })

                    if (newImage) {
                        form.reset()
                        setImage(data)
                        router.push(`/transformations/${newImage._id}`)
                    }
                } catch (error) {
                    console.log(error)
                }
            }

            if (action === "Update") {
                try {
                    const updatedImage = await updateImage({
                        image: {
                            ...imageData,
                            _id: data._id
                        },
                        userId,
                        path: `/transformations/${data._id}`
                    })

                    if (updatedImage) {
                        router.push(`/transformations/${updatedImage._id}`)
                    }
                } catch (error) {
                    console.log(error)
                }
            }
        }

        setIsSubmitting(false)
    }


    const onSelectFieldHandler = (value: string, onChangeField: (value: string) => void) => {
        const imageSize = aspectRatioOptions[value as AspectRatioKey]

        setImage((prev: any) => ({ ...prev, aspectRatio: imageSize.aspectRatio, width: imageSize.width, height: imageSize.height }))

        setNewTransformation(transformationType.config)

        return onChangeField(value)
    }

    const onInputChangeHandler = (fieldName: string, value: string, type: string, onChnageField: (value: string) => void) => {
        debounce(() => {
            setNewTransformation((prev: any) => ({
                ...prev,
                [type]: {
                    ...prev?.[type],
                    [fieldName === "prompt" ? "prompt" : "to"]: value
                }
            }))

            return onChnageField(value)
        }, 1000)
    }

    const onTransformHandler = () => {
        setIsTransforming(true)

        setTransformationConfig(deepMergeObjects(newTransformation, transformationConfig))

        setNewTransformation(null)

        startTransition(async () => {
            await updateCredits(userId, creditFee)
        })
    }

    useEffect(() => {
        if (image && (type === "restore" || type === "removeBackground")) {
            setNewTransformation(transformationType.config)
        }
    }, [image, transformationType.config, type])
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {creditBalance < Math.abs(creditFee) && <InsufficientCreditsModal />}

                <CustomField control={form.control} name="title" formLabel="Image Title" className="w-full" render={({ field }) => <Input {...field} className="input-field" />} />

                {type === "fill" &&
                    <CustomField
                        name="aspectRatio"
                        control={form.control}
                        formLabel="Aspect Ratio"
                        className="w-full"
                        render={({ field }) => (
                            <Select
                                onValueChange={(value) => onSelectFieldHandler(value, field.onChange)}>
                                <SelectTrigger className="select-field">
                                    <SelectValue placeholder="Select Size" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.keys(aspectRatioOptions).map((key) => (
                                        <SelectItem key={key} value={key} className="select-item">{aspectRatioOptions[key as AspectRatioKey].label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                }

                {(type === 'remove' || type === "recolor") && (
                    <div className="prompt-field">
                        <CustomField
                            control={form.control}
                            name="prompt"
                            formLabel={
                                type === "remove" ? "Object to remove" : "Object to recolor"
                            }
                            className="w-full"
                            render={({ field }) => (
                                <Input value={field.value} className="input-field" onChange={(e) => onInputChangeHandler('prompt', e.target.value, type, field.onChange)} />
                            )}
                        />


                        {type === "recolor" && (
                            <CustomField
                                control={form.control}
                                name="color"
                                formLabel="Replacement Color"
                                className="w-full"
                                render={({ field }) => (
                                    <Input
                                        value={field.value}
                                        className="input-field"
                                        onChange={(e) => onInputChangeHandler('color', e.target.value, type, field.onChange)}
                                    />
                                )}
                            />
                        )}
                    </div>
                )}

                <div className="media-uploader-field">
                    <CustomField
                        control={form.control}
                        name="publicId"
                        formLabel="Media Uploader"
                        className="flex size-full flex-col"
                        render={({ field }) => (
                            <MediaUploader
                                onValueChange={field.onChange}
                                setImage={setImage}
                                publicId={field.value as string}
                                image={image}
                                type={type}
                            />
                        )}
                    />

                    <TransformedImage
                        image={image}
                        type={type}
                        title={form.getValues().title}
                        isTransforming={IsTransforming}
                        setIsTransforming={setIsTransforming}
                        transformationConfig={transformationConfig}
                    />
                </div>

                <div className="flex flex-col gap-4">
                    <Button type="button" className="submit-button capitalize" onClick={onTransformHandler} disabled={IsTransforming || newTransformation === null}>{IsTransforming ? 'Transforming...' : "Apply Transformation"}</Button>
                    <Button type="submit" className="submit-button capitalize" disabled={isSubmitting}>{isSubmitting ? "Submitting" : "Submit"}</Button>
                </div>
            </form>
        </Form>
    )
}
