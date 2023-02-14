import shuffle from 'lodash-es/shuffle'
import type { FC } from 'react'
import { memo, useEffect } from 'react'
import useSWR from 'swr'

import type { LinkModel } from '@mx-space/api-client'
import { LinkState, LinkType } from '@mx-space/api-client'
import { Avatar } from '@mx-space/kami-design/components/Avatar'
import { PhUsersDuotone } from '@mx-space/kami-design/components/Icons'

import { apiClient } from '~/utils/client'

import styles from './index.module.css'
import { SectionWrap } from './section'

export const FriendItem: FC<LinkModel> = memo((props) => {
  return (
    <div className={styles['avatar-item']}>
      <Avatar imageUrl={props.avatar} alt={props.name} url={props.url} />
      <span className={styles['avatar-name']}>{props.name}</span>
    </div>
  )
})

export const FriendsSection: FC = memo(() => {
  const { data: friends, mutate } = useSWR(
    'home-friends',
    async () => {
      const res = await apiClient.link.getAll()
      const data = res.data as LinkModel[]
      return shuffle(
        data.filter(
          (i) =>
            i.type === LinkType.Friend && i.state === LinkState.Pass && !i.hide,
        ),
      ).slice(0, 20)
    },
    {
      fallbackData: [],
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
    },
  )

  useEffect(() => {
    mutate()
  }, [])

  if (!friends || !friends.length) {
    return null
  }

  return (
    <SectionWrap
      title="朋友们"
      moreUrl="friends"
      icon={<PhUsersDuotone />}
      className={'w-full'}
    >
      <div className={styles['friends-wrap']}>
        {friends?.map((item) => {
          return <FriendItem {...item} key={item.id} />
        })}
      </div>
    </SectionWrap>
  )
})
