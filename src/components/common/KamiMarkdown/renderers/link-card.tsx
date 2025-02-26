import axios from 'axios'
import clsx from 'clsx'
import type { FC } from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import RemoveMarkdown from 'remove-markdown'

import { simpleCamelcaseKeys as camelcaseKeys } from '@mx-space/api-client'

import { useRandomImage } from '~/hooks/app/use-kami-theme'
import { useIsUnMounted } from '~/hooks/common/use-is-unmounted'
import { useSafeSetState } from '~/hooks/common/use-safe-setState'
import { apiClient } from '~/utils/client'
import { getRandomImage } from '~/utils/images'

import styles from './link-card.module.css'

export type LinkCardSource = 'gh' | 'self'
export interface LinkCardProps {
  id: string
  source?: LinkCardSource
  className?: string
}
export const LinkCard: FC<LinkCardProps> = (props) => {
  const { id, source = 'self', className } = props
  const isUnMounted = useIsUnMounted()

  const [loading, setLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const fetchFnRef = useRef<() => Promise<any>>()

  const [fullUrl, _setFullUrl] = useState('about:blank')
  const [cardInfo, _setCardInfo] = useState<{
    title: string
    desc?: string
    image: string
  }>()
  const setFullUrl = useSafeSetState(_setFullUrl, isUnMounted)
  const setCardInfo = useSafeSetState(_setCardInfo, isUnMounted)
  const [randomImage] = useRandomImage(1)

  const isValidType = useMemo(() => {
    switch (source) {
      case 'self': {
        const [variant, params, ...rest] = id.split('/')

        if (!params) {
          return false
        }

        switch (variant) {
          case 'notes': {
            // e.g. variant === 'notes' ,  params === 124
            const valid = !isNaN(+params)
            if (!valid) {
              return false
            }
            fetchFnRef.current = async () => {
              return apiClient.note.getNoteById(+params).then((res) => {
                const { title, images, text } = res.data
                setCardInfo({
                  title,
                  desc: `${RemoveMarkdown(text).slice(0, 50)}...`,
                  // TODO
                  image: images?.[0]?.src || randomImage,
                })
              })
            }
            setFullUrl(`/notes/${params}`)

            return true
          }
          case 'posts': {
            // e.g. posts/programming/shell-output-via-sse
            const [slug] = rest
            if (!slug || !params) {
              return false
            }

            fetchFnRef.current = async () => {
              return apiClient.post.getPost(params, slug).then((res) => {
                const { title, images, text, summary } = res
                setCardInfo({
                  title,
                  desc: summary ?? `${RemoveMarkdown(text).slice(0, 50)}...`,
                  // TODO
                  image: images?.[0].src || getRandomImage(1)[0],
                })
              })
            }
            setFullUrl(`/posts/${params}/${slug}`)

            return true
          }
          default: {
            return false
          }
        }
      }
      case 'gh': {
        // e.g. mx-space/kami
        const [namespace, repo, ...rest] = id.split('/')
        if (!namespace || !repo) {
          return false
        }

        fetchFnRef.current = async () => {
          // https://api.github.com/repos/mx-space/core
          const data = await axios
            .get<any>(`https://api.github.com/repos/${namespace}/${repo}`)
            .then((data) => camelcaseKeys(data.data))

          setCardInfo({
            image: data.owner.avatarUrl,
            title: data.fullName,
            desc: data.description,
          })
          setFullUrl(data.htmlUrl)
        }

        return !rest.length
      }
    }
  }, [source, id])
  const fetchInfo = useCallback(async () => {
    if (!fetchFnRef.current) {
      return
    }
    setLoading(true)

    await fetchFnRef.current().catch(() => {
      setIsError(true)
    })
    setLoading(false)
  }, [])

  const { ref } = useInView({
    triggerOnce: true,
    onChange(inView) {
      if (!inView) {
        return
      }

      fetchInfo()
    },
  })

  if (!isValidType) {
    return null
  }

  return (
    <a
      href={fullUrl}
      target="_blank"
      ref={ref}
      className={clsx(
        (cardInfo || loading) && styles['card-grid'],
        (loading || isError) && styles['skeleton'],
        isError && styles['error'],
        className,
      )}
    >
      <div className={styles['contents']}>
        <div className={styles['title']}>{cardInfo?.title}</div>
        <div className={styles['desc']}>{cardInfo?.desc}</div>
      </div>
      {(loading || cardInfo?.image) && (
        <div
          className={styles['image']}
          data-image={cardInfo?.image || ''}
          style={{
            backgroundImage: cardInfo?.image
              ? `url(${cardInfo.image})`
              : undefined,
          }}
        />
      )}
    </a>
  )
}
