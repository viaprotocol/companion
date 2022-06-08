import React, { useState, useRef, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import styled from 'styled-components';
import { sortBy } from 'lodash';
import { StrayPageWithButton } from 'ui/component';
import DisplayAddressItem from './components/DisplayAddressItem';
import { useWalletOld as useWallet, useWalletRequest } from 'ui/utils';
import { Account } from 'background/service/preference';
import clsx from 'clsx';
import { KEYRING_TYPE } from 'consts';
import { IconImportSuccess } from 'ui/assets';
import ConfirmMnemonicsLogo from 'ui/assets/confirm-mnemonics.svg';
import { useMedia } from 'react-use';
import Mask from 'ui/assets/import-mask.png';
import IconArrowRight from 'ui/assets/import/import-arrow-right.svg';

import { message } from 'antd';
import { useRabbyDispatch, useRabbySelector } from '../../store';

const AddressWrapper = styled.div`
  & {
    overflow-y: auto;
  }
  &::-webkit-scrollbar {
    display: none;
  }
`;

const ConfirmMnemonics = ({ isPopup = false }: { isPopup?: boolean }) => {
  const history = useHistory();
  const { t } = useTranslation();
  const isWide = useMedia('(min-width: 401px)');

  const dispatch = useRabbyDispatch();
  const {
    importingAccounts,
    importedAddresses,
    stashKeyringId,
  } = useRabbySelector((s) => ({
    importingAccounts: s.importMnemonics.importingAccounts,
    importedAddresses: s.importMnemonics.importedAddresses,
    stashKeyringId: s.importMnemonics.stashKeyringId,
  }));

  const {
    state: { backFromImportMoreAddress },
  } = useLocation<{
    backFromImportMoreAddress?: boolean;
  }>();

  const wallet = useWallet();
  const [, setSpin] = useState(true);

  const [getAccounts] = useWalletRequest(
    async (firstFlag, start?, end?): Promise<Account[]> => {
      setSpin(true);
      return firstFlag
        ? await wallet.requestKeyring(
            KEYRING_TYPE.HdKeyring,
            'getFirstPage',
            stashKeyringId ?? null
          )
        : end
        ? await wallet.requestKeyring(
            KEYRING_TYPE.HdKeyring,
            'getAddresses',
            stashKeyringId ?? null,
            start,
            end
          )
        : await wallet.requestKeyring(
            KEYRING_TYPE.HdKeyring,
            'getNextPage',
            stashKeyringId ?? null
          );
    },
    {
      onSuccess(_accounts) {
        dispatch.importMnemonics.putQuriedAccountsByIndex({
          accounts: _accounts,
        });
        if (_accounts.length < 5) {
          throw new Error(
            t(
              'You need to make use your last account before you can add a new one'
            )
          );
        }
        setSpin(false);
        dispatch.importMnemonics.setSelectedIndexes({
          keyringId: stashKeyringId,
          indexes: [_accounts[0].index as number],
        });
      },
      onError(err) {
        message.error('Please check the connection with your wallet');
        setSpin(false);
      },
    }
  );

  useEffect(() => {
    dispatch.importMnemonics.getMnemonicsCounterAsync();
    dispatch.importMnemonics.getImportedAccountsAsync({
      keyringId: stashKeyringId,
    });

    if (backFromImportMoreAddress) return;
    getAccounts(true);

    return () => {
      dispatch.importMnemonics.cleanUpImportedInfoAsync({
        keyringId: stashKeyringId,
      });
    };
  }, [backFromImportMoreAddress]);

  const handleGotoImportMoreAddress = React.useCallback(() => {
    dispatch.importMnemonics.beforeImportMoreAddresses();
    history.replace({
      pathname: '/popup/import/mnemonics-import-more-address',
    });
  }, []);

  return (
    <StrayPageWithButton
      custom={isWide}
      className={clsx(isWide && 'rabby-stray-page')}
      hasDivider
      NextButtonContent={t('OK')}
      onNextClick={async () => {
        await dispatch.importMnemonics.confirmAllImportingAccountsAsync();
        await wallet.requestKeyring(
          KEYRING_TYPE.HdKeyring,
          'activeAccounts',
          stashKeyringId,
          importingAccounts.map((acc) => (acc.index as number) - 1)
        );
        await wallet.addKeyring(stashKeyringId);

        history.replace({
          pathname: isPopup ? '/popup/import/success' : '/import/success',
          state: {
            accounts: importingAccounts.map((account) => ({
              address: account.address,
              index: account.index,
              alianName: account.alianName,
              brandName: KEYRING_TYPE.HdKeyring,
              type: KEYRING_TYPE.HdKeyring,
            })),
            hasDivider: true,
            editing: true,
            showImportIcon: false,
            isMnemonics: true,
            importedAccount: true,
            importedLength: importedAddresses?.size,
          },
        });
      }}
      footerFixed
      noPadding={isPopup}
      isScrollContainer={isPopup}
    >
      {isPopup &&
        (!isWide ? (
          <header className="create-new-header create-password-header h-[264px]">
            <img
              className="rabby-logo"
              src="/images/logo-gray.png"
              alt="rabby logo"
            />
            <img
              className="unlock-logo w-[100px] h-[100px] mx-auto"
              src={ConfirmMnemonicsLogo}
            />
            <p className="text-24 mb-4 mt-0 text-white text-center font-bold">
              {t('Import the following address')}
            </p>
            <img src="/images/success-mask.png" className="mask" />
          </header>
        ) : (
          <div className="create-new-header create-password-header h-[220px]">
            <div className="rabby-container">
              <img
                className="unlock-logo w-[100px] h-[100px] mx-auto"
                src={ConfirmMnemonicsLogo}
              />
              <p className="text-24 mb-4 mt-0 text-white text-center font-bold">
                {t('Import the following address')}
              </p>
            </div>
            <img src={Mask} className="mask" />
          </div>
        ))}
      <div className={clsx(isPopup && 'rabby-container', 'overflow-auto')}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            // setStopEditing(true);
          }}
          className={clsx(
            'flex flex-col lg:justify-center text-center lg:h-auto',
            {
              'flex-1': isPopup,
              // 'overflow-auto': isPopup,
              'px-20': isPopup,
              'py-20': isPopup,
            }
          )}
        >
          {!isPopup && (
            <>
              <img
                src={IconImportSuccess}
                className="mx-auto mb-18 w-[100px] h-[100px]"
              />
              <div className="text-green text-20 mb-2">
                {t('Import the following address')}
              </div>
              <div className="text-title text-15 mb-12">
                <Trans
                  i18nKey="AddressCount"
                  values={{ count: importingAccounts?.length }}
                />
              </div>
            </>
          )}
          <AddressWrapper
            className={clsx(
              'confirm-mnemonics',
              !isPopup && 'lg:h-[200px] lg:w-[460px]'
            )}
          >
            {sortBy(importingAccounts, (item) => item?.index).map(
              (account, index) => {
                // TODO: use imported to show
                const imported = importedAddresses.has(
                  account.address.toLowerCase()
                );

                return (
                  <DisplayAddressItem
                    className="mb-12 rounded bg-white pt-10 pb-14 pl-16 h-[62px] flex"
                    key={account.address}
                    account={account}
                    index={index}
                  />
                );
              }
            )}
          </AddressWrapper>
          <div className="flex items-center justify-end">
            <span
              style={{ color: '#8697ff ' }}
              className="cursor-pointer text-12 leading-14"
              onClick={handleGotoImportMoreAddress}
            >
              <span>{t('Import more address')}</span>
              <img className="inline-block" src={IconArrowRight} />
            </span>
          </div>
        </div>
      </div>
    </StrayPageWithButton>
  );
};

export default ConfirmMnemonics;
